import { callClaudeJSON } from '../../llm/client';
import { logActivity } from '../../lib/activity-log';
import { supabase } from '../../lib/supabase';
import type { PipelineContext, ScriptedLead } from '../types';

interface ScriptOutput {
  index: number;
  why_this_lead: string;
  suggested_angle: string;
  opener_line: string;
  full_script: string;
  cold_email: string;
  email_subject: string;
  objection_handling: Array<{ objection: string; response: string }>;
}

const BATCH = 10;

/**
 * Generate per-lead scripts with the vertical's voice + Brain context +
 * the originating consequence chain. Persists scripted output to the
 * leads + lead_rationale tables.
 */
export async function generateScripts(ctx: PipelineContext): Promise<void> {
  if (ctx.scored.length === 0) {
    ctx.scripted = [];
    return;
  }

  const voice = ctx.vertical.config.script_voice;
  const brainText =
    ctx.brain.length > 0
      ? ctx.brain
          .slice(0, 12)
          .map((b) => `- [${b.type}, weight ${b.weight.toFixed(2)}] ${b.content}`)
          .join('\n')
      : '(no brain insights yet — first run for this vertical)';

  const system = `You are writing per-lead outreach for the vertical "${ctx.vertical.display_name}".

VOICE:
- Tone: ${voice.tone}
- Anchor phrases (use at least one verbatim): ${voice.anchor_phrases.join(' | ')}
- Never use: ${voice.forbidden_phrases.join(', ')}
- Pricing policy: ${voice.pricing_policy}

BRAIN CONTEXT (recent learnings — let these shape angle, anticipate objections, avoid known-failed framings):
${brainText}

For each lead, return JSON with:
- index (matches input)
- why_this_lead (1 paragraph; reference the originating signal + chain explicitly)
- suggested_angle (1 sentence; which framing to lead with)
- opener_line (the first 10 seconds, named lead, references their specific signal)
- full_script (30-second opener, natural speech, includes anchor phrase)
- cold_email (3-5 sentences, no greetings beyond first name, no closing fluff)
- email_subject (max 60 chars, lowercase preferred, no emoji)
- objection_handling (3 likely objections + responses)

Return ONLY a JSON array.`;

  const all: ScriptedLead[] = [];

  for (let i = 0; i < ctx.scored.length; i += BATCH) {
    const batch = ctx.scored.slice(i, i + BATCH);
    const user = batch
      .map((s, idx) => {
        const a = s.apollo;
        const c = s.triggering_chain;
        const org = a.organization;
        return `[${idx}]
Lead: ${a.first_name ?? ''} ${a.last_name ?? a.last_name_obfuscated ?? ''}, ${a.title ?? '(unknown title)'}
Company: ${org?.name ?? 'unknown'} — ${org?.industry ?? ''} — ~${org?.estimated_num_employees ?? '?'} employees
Location: ${a.city ?? org?.city ?? ''}, ${a.country ?? org?.country ?? ''}
Pain level: ${s.pain_level}
Triggering chain event: "${c.event}"
Cascading effects: ${c.cascading_effects.join(' → ')}
Target profile rationale: ${c.target_profile}
Charter trigger / urgency reason: ${c.charter_trigger ?? '(generic ICP)'}`;
      })
      .join('\n\n');

    try {
      const raw = await callClaudeJSON<ScriptOutput[]>({
        system,
        user,
        maxTokens: 6000,
        temperature: 0.6,
      });

      for (const out of raw) {
        const s = batch[out.index];
        if (!s) continue;
        all.push({
          ...s,
          why_this_lead: out.why_this_lead,
          suggested_angle: out.suggested_angle,
          opener_line: out.opener_line,
          full_script: out.full_script,
          cold_email: out.cold_email,
          email_subject: out.email_subject,
          objection_handling: out.objection_handling ?? [],
        });
      }
    } catch (err) {
      await logActivity({
        run_id: ctx.run_id,
        vertical_id: ctx.vertical_id,
        type: 'error',
        message: `❌ Script batch ${i / BATCH} failed: ${(err as Error).message}`,
      });
    }
  }

  ctx.scripted = all;

  for (const s of ctx.scripted) {
    const a = s.apollo;
    const org = a.organization;
    const fullName = [a.first_name, a.last_name ?? a.last_name_obfuscated].filter(Boolean).join(' ');
    const domain =
      org?.primary_domain ??
      (org?.website_url ?? '').replace(/^https?:\/\//, '').split('/')[0] ??
      null;

    const { data: leadRow, error: leadErr } = await supabase()
      .from('leads')
      .insert({
        vertical_id: ctx.vertical_id,
        run_id: ctx.run_id,
        name: fullName || null,
        title: a.title ?? null,
        company: org?.name ?? null,
        location: [a.city, a.country].filter(Boolean).join(', ') || null,
        phone: a.phone ?? null,
        email: a.email ?? null,
        domain,
        pain_level: s.pain_level,
        apollo_data: a as unknown as object,
      })
      .select('id')
      .single();

    if (leadErr || !leadRow) {
      console.error('[generate-scripts] lead insert failed:', leadErr);
      continue;
    }

    await supabase().from('lead_rationale').insert({
      lead_id: leadRow.id,
      signal_chain: s.triggering_chain as unknown as object,
      pain_level: s.pain_level,
      suggested_angle: s.suggested_angle,
      opener_line: s.opener_line,
      full_script: s.full_script,
      cold_email: s.cold_email,
      email_subject: s.email_subject,
      objection_handling: s.objection_handling as unknown as object,
    });
  }

  await logActivity({
    run_id: ctx.run_id,
    vertical_id: ctx.vertical_id,
    type: 'agent_step',
    message: `✍️ Generated ${ctx.scripted.length} per-lead scripts and saved to DB`,
  });
}
