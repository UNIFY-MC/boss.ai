// Script-playbook generator (B5).
//
// Takes a vertical + its brain entries and composes a runnable cold-call
// script with:
//   - 5 opener variants (each keyed to a lead-context trigger)
//   - Top angles (the brain learned these land)
//   - Objection rebuttals (the brain learned these recur)
//   - Asks (the primary commitment + softer fallbacks)
//   - Avoid list (deal-killers + bad profiles)
//   - Voicemail script (separate, optimized for one-shot)
//
// Each brain entry that fed a section is tagged with playbook_credit so the
// outcome → weight feedback loop knows what to bump after a call lands.

import { z } from 'zod';
import { callClaudeJSON } from '../llm/client';
import { supabase } from '../lib/supabase';
import { logActivity } from '../lib/activity-log';

const RECENCY_HALFLIFE_DAYS = 60;
const MAX_BRAIN_ENTRIES_TO_RANK = 40;

function recencyDecayedWeight(weight: number, createdAtIso: string): number {
  const ageMs = Date.now() - new Date(createdAtIso).getTime();
  const ageDays = Math.max(0, ageMs / 86_400_000);
  const decay = Math.pow(0.5, ageDays / RECENCY_HALFLIFE_DAYS);
  return (weight ?? 1) * decay;
}

/* ───────────────────────── Schema ───────────────────────── */

const OpenerVariantSchema = z.object({
  id: z.enum([
    'cold_no_context',
    'trigger_funding',
    'trigger_hiring_spree',
    'trigger_competitor',
    'referral',
  ]),
  text: z.string().min(20),
  trigger_hint: z.string().optional(),
});

const AngleSchema = z.object({
  id: z.string(),
  text: z.string().min(10),
  weight: z.number().min(0).max(3).default(1),
  source_entry_ids: z.array(z.string()).default([]),
});

const ObjectionSchema = z.object({
  id: z.string(),
  trigger: z.string().min(4),
  rebuttal: z.string().min(10),
  source_entry_ids: z.array(z.string()).default([]),
});

const AskSchema = z.object({
  id: z.string(),
  text: z.string().min(8),
  primary: z.boolean().default(false),
});

const PlaybookSchema = z.object({
  opener_variants: z.array(OpenerVariantSchema).min(3).max(5),
  angles: z.array(AngleSchema).min(2).max(6),
  objections: z.array(ObjectionSchema).min(2).max(6),
  asks: z.array(AskSchema).min(1).max(4),
  avoid: z.array(z.string()).default([]),
  voicemail_script: z.string().min(20),
  pre_call_brief_template: z.string().min(20),
});

export type Playbook = z.infer<typeof PlaybookSchema> & {
  generated_at: string;
  based_on_brain_entries: number;
};

/* ───────────────────────── Generator ───────────────────────── */

interface BrainEntryLite {
  id: string;
  type: string;
  content: string;
  evidence_quote: string | null;
  weight: number | null;
  source: string | null;
  created_at: string;
}

export async function generatePlaybookForVertical(
  verticalId: string,
): Promise<Playbook> {
  const sb = supabase();

  // 1. Load vertical
  const { data: vertical, error: vErr } = await sb
    .from('verticals')
    .select('id, slug, display_name, config')
    .eq('id', verticalId)
    .single();
  if (vErr || !vertical) throw new Error(`Vertical not found: ${verticalId}`);

  await logActivity({
    vertical_id: verticalId,
    type: 'agent_step',
    message: `Composing playbook for ${vertical.display_name} from the brain…`,
    metadata: { stage: 'playbook_regen_start' },
  });

  // 2. Load brain entries, rank by recency-decayed weight
  const { data: rawEntries } = await sb
    .from('brain_entries')
    .select('id, type, content, evidence_quote, weight, source, created_at')
    .eq('vertical_id', verticalId)
    .order('created_at', { ascending: false })
    .limit(200);

  const entries: BrainEntryLite[] = (rawEntries || []) as BrainEntryLite[];
  const ranked = entries
    .map((e) => ({
      entry: e,
      score: recencyDecayedWeight(Number(e.weight ?? 1), e.created_at),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_BRAIN_ENTRIES_TO_RANK)
    .map((r) => r.entry);

  // 3. Build prompt — feed only the top-ranked entries, with IDs, so the
  //    model can attribute each playbook section back to source entries.
  const config = (vertical.config ?? {}) as Record<string, unknown>;
  const icp = (config.icp ?? {}) as Record<string, unknown>;
  const voice = (config.voice ?? {}) as Record<string, unknown>;

  const system = `You compose runnable cold-call scripts from real brain entries.
Output strict JSON only. Write like a human SDR talks — direct, specific,
short. NO marketing-speak. NO clichés ("circle back", "touch base", "value
prop"). NO em-dashes. NO sentences that start with "So,".

Hard constraints:
- Opener variants: 1-2 sentences each. Real words. The first 6 words must
  earn 15 seconds of attention. Mention the named trigger event hint.
- Angles: 1 sentence each. A concrete pain or outcome, not a category.
  Bad: "Help with hiring." Good: "Hiring 3 SDRs in 60 days without an
  onboarding playbook eats your AE pipeline."
- Objections: trigger is what the prospect ACTUALLY says (in quotes,
  conversational). Rebuttal is 1-2 sentences, opens with empathy, ends
  with a specific micro-ask. No lecturing.
- Asks: one primary ask + 1-2 softer fallbacks. Be specific
  (duration, day-of-week, format).
- Voicemail: ~35 words spoken in 12-15 seconds. Name, 1-line hook,
  callback ask. No company description.
- Pre-call brief template uses {{trigger_event}}, {{company}}, {{title}},
  {{pain_point}} fill slots.
- Cite source_entry_ids when an angle/objection/rebuttal came from a
  specific brain entry. Empty array if synthesized.`;

  const user = [
    `Vertical: ${vertical.display_name} (slug: ${vertical.slug})`,
    `ICP titles: ${JSON.stringify((icp as { titles?: string[] }).titles ?? [])}`,
    `ICP industries: ${JSON.stringify((icp as { industries?: string[] }).industries ?? [])}`,
    `Voice anchor phrases: ${JSON.stringify((voice as { anchor_phrases?: string[] }).anchor_phrases ?? [])}`,
    `Voice forbidden phrases: ${JSON.stringify((voice as { forbidden_phrases?: string[] }).forbidden_phrases ?? [])}`,
    '',
    `Brain entries (${ranked.length} top-ranked by recency-decayed weight):`,
    ...ranked.map(
      (e) =>
        `- [${e.id}] type=${e.type} weight=${e.weight ?? 1} src=${e.source ?? '?'}\n  content: ${e.content}${e.evidence_quote ? `\n  quote: "${e.evidence_quote}"` : ''}`,
    ),
    '',
    `Output a JSON object matching this exact shape:`,
    `{
  "opener_variants": [
    {"id": "cold_no_context", "text": "...", "trigger_hint": "no recent signal"},
    {"id": "trigger_funding", "text": "...", "trigger_hint": "raised seed/A/B/C in last 90 days"},
    {"id": "trigger_hiring_spree", "text": "...", "trigger_hint": "posted 3+ SDR/AE roles"},
    {"id": "trigger_competitor", "text": "...", "trigger_hint": "competitor announced X"},
    {"id": "referral", "text": "...", "trigger_hint": "warm intro from {{name}}"}
  ],
  "angles": [
    {"id": "angle_pain_X", "text": "...", "weight": 1.4, "source_entry_ids": ["..."]}
  ],
  "objections": [
    {"id": "pricing", "trigger": "we don't have budget", "rebuttal": "...", "source_entry_ids": ["..."]},
    {"id": "timing", "trigger": "not right now", "rebuttal": "...", "source_entry_ids": []}
  ],
  "asks": [
    {"id": "zoom_15", "text": "15-min Zoom this week", "primary": true},
    {"id": "intro_pm", "text": "Email intro to the hiring manager", "primary": false}
  ],
  "avoid": ["Don't lead with discount", "..."],
  "voicemail_script": "Hi {{first}}, this is Kyle with Deals Machine — quick one: {{ask}}. I'll text the link.",
  "pre_call_brief_template": "{{company}} ({{title}}). Recent signal: {{trigger_event}}. Pain you can hit: {{pain_point}}."
}`,
  ].join('\n');

  await logActivity({
    vertical_id: verticalId,
    type: 'agent_step',
    message: `Ranking top ${ranked.length} brain entries by recency-decayed weight…`,
    metadata: { stage: 'playbook_rank_entries', count: ranked.length },
  });

  const raw = await callClaudeJSON({
    system,
    user,
    maxTokens: 3500,
    temperature: 0.55,
  });

  const parsed = PlaybookSchema.parse(raw);

  // 4. Tag brain entries with playbook_credit
  const creditByEntryId: Record<string, string> = {};
  for (const angle of parsed.angles) {
    for (const id of angle.source_entry_ids) creditByEntryId[id] = `angle.${angle.id}`;
  }
  for (const obj of parsed.objections) {
    for (const id of obj.source_entry_ids) creditByEntryId[id] = `objection.${obj.id}`;
  }
  for (const [entryId, credit] of Object.entries(creditByEntryId)) {
    await sb.from('brain_entries').update({ playbook_credit: credit }).eq('id', entryId);
  }

  // 5. Persist playbook on the vertical's config
  const playbook: Playbook = {
    ...parsed,
    generated_at: new Date().toISOString(),
    based_on_brain_entries: ranked.length,
  };
  const nextConfig = { ...config, playbook };
  await sb.from('verticals').update({ config: nextConfig }).eq('id', verticalId);

  await logActivity({
    vertical_id: verticalId,
    type: 'info',
    message: `Playbook regenerated · ${parsed.opener_variants.length} openers, ${parsed.angles.length} angles, ${parsed.objections.length} objections`,
    metadata: {
      kind: 'playbook_regenerated',
      based_on_brain_entries: ranked.length,
      credited_entries: Object.keys(creditByEntryId).length,
    },
  });

  return playbook;
}

/* ───────────────────────── Auto-regen debounce ───────────────────────── */
//
// Brain entries land in bursts. We don't want to regenerate the playbook
// 5 times back-to-back during a single call's enrichment pass. Each vertical
// keeps a "pending until" timestamp; if a regen is requested before that
// timestamp, we just bump the timer. When the timer expires, we run once.

const DEBOUNCE_WINDOW_MS = 30_000;
const pendingByVertical = new Map<string, NodeJS.Timeout>();

export function scheduleAutoRegen(verticalId: string): void {
  const existing = pendingByVertical.get(verticalId);
  if (existing) clearTimeout(existing);
  const t = setTimeout(async () => {
    pendingByVertical.delete(verticalId);
    try {
      await generatePlaybookForVertical(verticalId);
    } catch (err) {
      console.error(`[playbook] auto-regen failed for vertical ${verticalId}:`, err);
    }
  }, DEBOUNCE_WINDOW_MS);
  pendingByVertical.set(verticalId, t);
}
