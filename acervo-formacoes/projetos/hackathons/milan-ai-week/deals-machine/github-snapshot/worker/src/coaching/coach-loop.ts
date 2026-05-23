// Coach loop — runs on a buffered transcript every ~5s during a live call.
//
// Ingests:
//   - rolling 30s transcript window (combined partials + finals)
//   - playbook used on this call
//   - lead context (name, title, trigger, memory)
//
// Asks Haiku 4.5: any objection just surfaced? confirmation we're missing?
// section transition? Insert into live_coaching_events; cockpit gets it
// via Supabase Realtime.

import { z } from 'zod';
import { callClaudeJSON } from '../llm/client';
import { supabase } from '../lib/supabase';

const COACH_MODEL = 'claude-haiku-4-5-20251001';

const CoachOutputSchema = z.object({
  events: z.array(z.object({
    type: z.enum([
      'objection_detected',
      'suggestion',
      'confirmation_gap',
      'section_change',
      'ack',
      'closing_cue',
      'commitment_heard',
    ]),
    message: z.string().min(4).max(280),
    suggested_action: z.string().max(280).optional(),
    playbook_ref: z.string().optional(),
  })).default([]),
});

export interface CoachContext {
  callId: string;
  leadId: string | null;
  verticalId: string | null;
  playbook: Record<string, unknown> | null;
  lead: {
    name?: string | null;
    title?: string | null;
    company?: string | null;
    email?: string | null;
    trigger_event?: string | null;
  } | null;
}

export interface CoachLoopOptions {
  ctx: CoachContext;
  /** Function that returns the current rolling-30s transcript text. */
  getTranscript: () => string;
  /** Interval ms between coaching passes. Defaults to 5s. */
  intervalMs?: number;
}

export class CoachLoop {
  private timer: NodeJS.Timeout | null = null;
  private lastFiredEvents = new Set<string>(); // de-dupe by fingerprint
  private inFlight = false;

  constructor(private opts: CoachLoopOptions) {}

  start(): void {
    if (this.timer) return;
    const interval = this.opts.intervalMs ?? 5_000;
    this.timer = setInterval(() => void this.tick(), interval);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private tickCount = 0;

  private async tick(): Promise<void> {
    this.tickCount++;
    if (this.inFlight) {
      if (this.tickCount % 4 === 0) console.log(`[coach-loop] tick ${this.tickCount}: previous still in-flight, skipping`);
      return;
    }
    const transcript = this.opts.getTranscript().trim();
    // Lowered from 40 → 15 so short opening exchanges ("Hi, this is Kyle —
    // do you have 30 seconds?") can still trigger the first coaching pass.
    if (transcript.length < 15) {
      if (this.tickCount === 1 || this.tickCount % 4 === 0) {
        console.log(`[coach-loop] tick ${this.tickCount}: transcript too short (${transcript.length} chars), waiting`);
      }
      return;
    }
    console.log(`[coach-loop] tick ${this.tickCount}: firing Haiku on ${transcript.length} chars of transcript`);
    this.inFlight = true;

    try {
      const playbookHint = this.opts.ctx.playbook
        ? [
            `Playbook in use:`,
            `- Asks: ${(this.opts.ctx.playbook.asks as { text: string }[] | undefined)?.map((a) => a.text).join(' | ') || 'n/a'}`,
            `- Known objections: ${(this.opts.ctx.playbook.objections as { id: string; trigger: string }[] | undefined)?.map((o) => `${o.id} ("${o.trigger}")`).join(', ') || 'n/a'}`,
          ].join('\n')
        : 'No playbook (cold).';

      const lead = this.opts.ctx.lead;

      const system = `You are a real-time cold-call coach. Watch the
transcript window and surface AT MOST 1-2 coaching events. Be precise,
not chatty.

Output rules (CRITICAL):
- Write ready-to-read text. NEVER use bracket placeholders like
  [prospect name], [company], [their pain point], [specific objection].
  The lead's name, title, and company are in the user message — use
  those exact strings inline. If you don't know a specific detail, omit
  it rather than emit a bracket.
- Each message is <= 30 words, conversational, second-person to the rep.
  Example BAD:  "Acknowledge [their concern] and pivot to [your value prop]."
  Example GOOD: "Acknowledge Kinga's budget concern and pivot to ROI math —
                 you're not adding spend, you're reallocating it."
- suggested_action is a single short imperative the rep can do in 5 seconds.
  Same rule: zero brackets, full names where relevant.

Event types:
- Don't fire events for things that haven't happened. If nothing notable
  occurred in the most recent exchange, return empty events array.
- objection_detected: prospect raised a known objection — give the rebuttal.
- suggestion: rep should do something specific now (cite playbook).
- confirmation_gap: rep agreed on something but didn't confirm the detail
  (e.g. "I'll send the link" but no email confirmed).
- section_change: rep transitioned (opener → discovery, etc.).
- commitment_heard: prospect just committed to something — flag it.
- closing_cue: it's time to close for the ask.`;

      const user = [
        `Lead: ${lead?.name ?? '?'} · ${lead?.title ?? '?'} @ ${lead?.company ?? '?'}`,
        `Email on file: ${lead?.email ?? 'NOT SET'}`,
        playbookHint,
        '',
        `Rolling transcript (most recent at bottom):`,
        transcript,
        '',
        `Output JSON: {"events": [...]} — empty array if nothing notable.`,
      ].join('\n');

      const raw = await callClaudeJSON({
        system,
        user,
        model: COACH_MODEL,
        maxTokens: 600,
        temperature: 0.3,
      });
      const parsed = CoachOutputSchema.parse(raw);

      console.log(`[coach-loop] Haiku returned ${parsed.events.length} event(s)`);

      if (parsed.events.length === 0) return;

      const sb = supabase();
      for (const ev of parsed.events) {
        // De-dupe: same type+message fired in this loop's lifetime is a no-op
        const fp = `${ev.type}::${ev.message.slice(0, 80)}`;
        if (this.lastFiredEvents.has(fp)) continue;
        this.lastFiredEvents.add(fp);

        await sb.from('live_coaching_events').insert({
          call_id: this.opts.ctx.callId,
          lead_id: this.opts.ctx.leadId,
          vertical_id: this.opts.ctx.verticalId,
          type: ev.type,
          message: ev.message,
          suggested_action: ev.suggested_action ?? null,
          playbook_ref: ev.playbook_ref ?? null,
          source_transcript_window: transcript.slice(-500),
        });
      }

      // Bump coaching_events_count
      await sb
        .from('calls')
        .update({ coaching_events_count: this.lastFiredEvents.size })
        .eq('id', this.opts.ctx.callId);
    } catch (err) {
      console.error('[coach-loop] tick failed:', err);
    } finally {
      this.inFlight = false;
    }
  }
}
