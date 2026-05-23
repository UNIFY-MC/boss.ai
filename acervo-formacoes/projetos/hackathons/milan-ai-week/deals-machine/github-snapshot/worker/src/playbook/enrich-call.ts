// Post-call enrichment.
//
// Runs on a call once its transcript has landed. Produces:
//   - what_worked[]       — angles/rebuttals/asks that landed
//   - what_to_improve[]   — missed asks, wasted time, dropped moments
//   - confirmations[]     — email/time/next-step confirmed mid-call (Yes/No/edit)
//   - outcome_signal      — meeting_set | qualified_interest | objection_unhandled
//                           | killed | voicemail
//
// Writes results onto the calls row + emits brain entries with playbook_credit.
// Schedules auto-regen for the vertical so the playbook absorbs the learnings.

import { z } from 'zod';
import { callClaudeJSON } from '../llm/client';
import { supabase } from '../lib/supabase';
import { logActivity } from '../lib/activity-log';
import { scheduleAutoRegen } from './generate';

const ALLOWED_INSIGHT_TYPES = [
  'angle_landed',
  'angle_failed',
  'objection_recurring',
  'commitment_made',
  'deal_killer',
  'profile_chase',
  'profile_avoid',
] as const;
type InsightType = typeof ALLOWED_INSIGHT_TYPES[number];

const INSIGHT_TYPE_SYNONYMS: Record<string, InsightType> = {
  angle: 'angle_landed',
  angle_won: 'angle_landed',
  positive_signal: 'angle_landed',
  angle_lost: 'angle_failed',
  failed_angle: 'angle_failed',
  negative_signal: 'angle_failed',
  objection: 'objection_recurring',
  recurring_objection: 'objection_recurring',
  commitment: 'commitment_made',
  agreement: 'commitment_made',
  customer_intent: 'commitment_made',
  next_step: 'commitment_made',
  killer: 'deal_killer',
  blocker: 'deal_killer',
  red_flag: 'deal_killer',
  chase: 'profile_chase',
  ideal_profile: 'profile_chase',
  good_fit: 'profile_chase',
  avoid: 'profile_avoid',
  bad_fit: 'profile_avoid',
  disqualifier: 'profile_avoid',
};

function normalizeInsightType(t: unknown): InsightType | null {
  if (typeof t !== 'string') return null;
  if ((ALLOWED_INSIGHT_TYPES as readonly string[]).includes(t)) return t as InsightType;
  return INSIGHT_TYPE_SYNONYMS[t] ?? null;
}

const ALLOWED_OUTCOMES = new Set([
  'meeting_set', 'qualified_interest', 'objection_unhandled',
  'killed', 'voicemail', 'no_answer', 'follow_up_needed',
]);
const ALLOWED_CONFIRMATION_KINDS = new Set([
  'email', 'phone', 'next_step', 'time', 'name', 'company',
]);

// Permissive schema. brain_insights.type and confirmations.kind are strings
// here; we filter + normalize them after parsing so one bad value doesn't
// reject the whole enrichment.
const EnrichmentSchema = z.object({
  what_worked: z.array(z.object({
    section: z.string(),
    note: z.string(),
    quote: z.string().optional(),
  })).default([]),
  what_to_improve: z.array(z.object({
    section: z.string(),
    note: z.string(),
  })).default([]),
  confirmations: z.array(z.object({
    kind: z.string(),
    value: z.string(),
    confirmed: z.boolean(),
  })).default([]),
  outcome_signal: z.string().default('follow_up_needed'),
  brain_insights: z.array(z.object({
    type: z.string(),
    content: z.string(),
    evidence_quote: z.string().optional(),
    weight: z.number().min(0).max(3).default(1),
    playbook_credit: z.string().optional(),
  })).default([]),
});

export type CallEnrichment = z.infer<typeof EnrichmentSchema>;

export async function enrichCall(callId: string): Promise<CallEnrichment> {
  const sb = supabase();

  // Load call + lead + vertical + transcript + playbook snapshot
  const { data: call, error: callErr } = await sb
    .from('calls')
    .select('id, lead_id, vertical_id, transcript_id, playbook_snapshot')
    .eq('id', callId)
    .single();
  if (callErr || !call) throw new Error(`Call not found: ${callId}`);

  const { data: transcript } = await sb
    .from('transcripts')
    .select('raw_text')
    .eq('id', call.transcript_id)
    .maybeSingle();
  if (!transcript?.raw_text || !transcript.raw_text.trim()) {
    throw new Error(`Transcript not ready for call ${callId}`);
  }

  const { data: lead } = await sb
    .from('leads')
    .select('id, name, title, company, email, phone, trigger_event, memory_summary')
    .eq('id', call.lead_id)
    .single();

  const { data: vertical } = await sb
    .from('verticals')
    .select('id, display_name, config')
    .eq('id', call.vertical_id)
    .single();

  // Use snapshotted playbook if available; otherwise live one
  const playbook =
    call.playbook_snapshot || vertical?.config?.playbook || null;

  await logActivity({
    lead_id: call.lead_id,
    vertical_id: call.vertical_id,
    type: 'agent_step',
    message: `Enriching call · scoring against the playbook`,
    metadata: { stage: 'enrich_call_start', call_id: callId },
  });

  const system = `You are a senior cold-call coach reviewing a transcribed
sales call. Score the call against the playbook the rep used. Be specific —
cite actual phrases. Output strict JSON only.

Hard rules:
- what_worked items must reference real moments in the transcript (quote).
- what_to_improve must be actionable, not generic ("missed the email ask").
- confirmations[] kind MUST be exactly one of: email, phone, next_step,
  time, name, company. Nothing else.
- outcome_signal MUST be exactly one of: meeting_set, qualified_interest,
  objection_unhandled, killed, voicemail, no_answer, follow_up_needed.
- brain_insights[] type MUST be exactly one of: angle_landed, angle_failed,
  objection_recurring, commitment_made, deal_killer, profile_chase,
  profile_avoid. Do NOT invent new types — pick the closest match.
- Each insight should be a learning that generalizes beyond this one call.`;

  const playbookSummary = playbook
    ? [
        `Playbook used:`,
        `- Asks: ${playbook.asks?.map((a: { text: string }) => a.text).join(' | ') || 'n/a'}`,
        `- Angles: ${playbook.angles?.map((a: { id: string }) => a.id).join(', ') || 'n/a'}`,
        `- Known objections: ${playbook.objections?.map((o: { id: string }) => o.id).join(', ') || 'n/a'}`,
      ].join('\n')
    : 'No playbook (cold).';

  const user = [
    `Vertical: ${vertical?.display_name ?? '?'}`,
    `Lead: ${lead?.name ?? '?'} (${lead?.title ?? '?'} @ ${lead?.company ?? '?'})`,
    `Trigger event: ${lead?.trigger_event ?? 'none recorded'}`,
    ``,
    playbookSummary,
    ``,
    `Transcript:`,
    transcript.raw_text,
    ``,
    `Score the call. Output JSON matching:
{
  "what_worked": [{"section": "opener|angle|objection|ask", "note": "...", "quote": "..."}],
  "what_to_improve": [{"section": "opener|angle|objection|ask|listening|close", "note": "..."}],
  "confirmations": [{"kind": "email|phone|next_step|time|name|company", "value": "...", "confirmed": true}],
  "outcome_signal": "meeting_set",
  "brain_insights": [
    {"type": "angle_landed", "content": "...", "evidence_quote": "...", "weight": 1.3, "playbook_credit": "angle.<id>"}
  ]
}`,
  ].join('\n');

  const raw = await callClaudeJSON({
    system,
    user,
    maxTokens: 3500,
    temperature: 0.4,
  });
  const parsed = EnrichmentSchema.parse(raw);

  // Normalize + filter loose fields the LLM may have drifted on
  const outcomeSignal = ALLOWED_OUTCOMES.has(parsed.outcome_signal)
    ? parsed.outcome_signal
    : 'follow_up_needed';
  const confirmations = parsed.confirmations.filter((c) =>
    ALLOWED_CONFIRMATION_KINDS.has(c.kind),
  );
  // brain_insights: map unknown types via synonyms; drop ones that can't be
  // mapped so a bad entry doesn't poison the rest.
  const droppedInsights: string[] = [];
  const brainInsights = parsed.brain_insights
    .map((b) => {
      const normalized = normalizeInsightType(b.type);
      if (!normalized) {
        droppedInsights.push(b.type);
        return null;
      }
      return { ...b, type: normalized };
    })
    .filter(Boolean) as Array<{
      type: InsightType;
      content: string;
      evidence_quote?: string;
      weight: number;
      playbook_credit?: string;
    }>;

  const enrichment: CallEnrichment = {
    ...parsed,
    outcome_signal: outcomeSignal,
    confirmations,
    brain_insights: brainInsights,
  };

  // Persist on calls row
  await sb
    .from('calls')
    .update({
      enrichment: enrichment as unknown as Record<string, unknown>,
      outcome_signal: enrichment.outcome_signal,
    })
    .eq('id', callId);

  // Insert brain entries
  if (brainInsights.length > 0) {
    const rows = brainInsights.map((b) => ({
      vertical_id: call.vertical_id,
      lead_id: call.lead_id,
      type: b.type,
      content: b.content,
      evidence_quote: b.evidence_quote ?? null,
      weight: b.weight,
      source: 'brain',
      source_ref: callId,
      playbook_credit: b.playbook_credit ?? null,
    }));
    await sb.from('brain_entries').insert(rows);
  }
  if (droppedInsights.length > 0) {
    console.warn(
      `[enrich-call] dropped ${droppedInsights.length} insights with unknown types:`,
      droppedInsights,
    );
  }

  await logActivity({
    lead_id: call.lead_id,
    vertical_id: call.vertical_id,
    type: 'info',
    message: `Call scored · ${enrichment.what_worked.length} wins, ${enrichment.what_to_improve.length} improvements, signal=${enrichment.outcome_signal}`,
    metadata: { kind: 'call_enriched', call_id: callId, outcome: enrichment.outcome_signal },
  });

  // Trigger auto-regen so the playbook absorbs new learnings (debounced)
  scheduleAutoRegen(call.vertical_id);

  return enrichment;
}
