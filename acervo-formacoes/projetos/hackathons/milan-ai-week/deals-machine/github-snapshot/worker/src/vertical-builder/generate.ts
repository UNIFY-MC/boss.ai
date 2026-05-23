// Vertical-builder agent. Composes a runnable ICP, signal sources, chain
// persona, and operator voice from a one-paragraph description.
//
// Multi-step reasoning flow:
//   1. ICP analysis      — derive titles, sizes, industries from what/who inputs
//   2. Signal sources    — pick free, scrapeable sources + relevance prompt
//   3. Chain persona     — draft the expert persona for the chain-builder
//   4. Voice             — tone, anchor phrases, forbidden phrases
//   5. Self-critique     — agent reviews its own output, surfaces warnings
//   6. Consolidation     — display_name, slug, rationale, final assembly
//
// Each step logs to activity_log with the user's actual input interpolated
// so the streaming reasoning UI narrates this specific vertical.

import { z } from 'zod';
import type { VerticalConfig } from '@verticals';
import { callClaudeJSON } from '../llm/client';
import { logActivity } from '../lib/activity-log';

/**
 * Deep-merge `patch` onto `base`. Plain objects merge recursively; arrays and
 * primitives in `patch` replace `base` (no array concat). Used to repair
 * partial refinement responses so the wizard isn't crashed by tiny omissions.
 */
function deepMerge(base: Record<string, unknown>, patch: Record<string, unknown> | unknown): Record<string, unknown> {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) return base;
  const out: Record<string, unknown> = { ...base };
  for (const [k, v] of Object.entries(patch as Record<string, unknown>)) {
    if (v === undefined) continue;
    const prev = out[k];
    if (
      v &&
      typeof v === 'object' &&
      !Array.isArray(v) &&
      prev &&
      typeof prev === 'object' &&
      !Array.isArray(prev)
    ) {
      out[k] = deepMerge(prev as Record<string, unknown>, v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

export interface GenerateInput {
  // New structured input (preferred)
  what_sold?: string;
  who_sold_to?: string;
  countries?: string[];        // e.g. ['US', 'UK', 'DACH']
  company_sizes?: string[];    // e.g. ['10-50', '50-200']
  revenue_ranges?: string[];   // e.g. ['$10M-$50M', '$50M-$250M']

  // Legacy single textarea input (fallback)
  description?: string;

  run_id?: string;             // for streaming reasoning to activity_log
}

// Schemas are deliberately permissive on shape/length checks — strict min()
// constraints used to crash valid-but-imperfect responses (especially on the
// refinement path where Claude shuffles fields). The agent is responsible for
// quality; the schema is responsible for type safety.
const IcpSchema = z.object({
  titles: z.array(z.string()).default([]),
  titles_exclude: z.array(z.string()).default([]),
  company_size_range: z.tuple([z.number(), z.number()]),
  countries: z.array(z.string()).default([]),
  industries: z.array(z.string()).default([]),
  company_exclusions: z.array(z.string()).default([]),
  revenue_range: z.array(z.string()).default([]),
});

const SignalSourceSchema = z.object({
  type: z.string().default('composite'),
  sources: z
    .array(
      z.object({
        name: z.string(),
        url: z.string().optional(),
        api_key_env: z.string().optional(),
        filters: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .default([]),
  relevance_prompt: z.string().default(''),
});

const VoiceSchema = z.object({
  tone: z.string().default(''),
  anchor_phrases: z.array(z.string()).default([]),
  forbidden_phrases: z.array(z.string()).default([]),
  pricing_policy: z.enum(['never_mention', 'on_request', 'open']).default('on_request'),
});

const FullConfigSchema = z.object({
  icp: IcpSchema,
  signal_source: SignalSourceSchema,
  chain_builder_persona: z.string().default(''),
  script_voice: VoiceSchema,
  // crm.custom_fields is intentionally permissive — agents sometimes return
  // nested objects or null-valued entries here, and the field is downstream
  // metadata not used by reasoning steps.
  crm: z
    .object({
      hubspot_pipeline_id: z.string().nullable().optional(),
      custom_fields: z.record(z.string(), z.unknown()).optional(),
    })
    .passthrough()
    .default({ hubspot_pipeline_id: null, custom_fields: {} }),
  cron_time: z.string().default('07:00'),
  timezone: z.string().default('Europe/Berlin'),
  target_daily_leads: z.number().int().positive().max(50).default(15),
});

const ResponseSchema = z.object({
  display_name: z.string().min(3),
  slug: z
    .string()
    .min(2)
    .regex(/^[a-z0-9-]+$/, 'slug must be kebab-case'),
  config: FullConfigSchema,
  short_summary: z.string().default(''),
  rationale: z.string(),
  warnings: z.array(z.string()).default([]),
});

export type GeneratedVertical = z.infer<typeof ResponseSchema>;

function summarizeInput(input: GenerateInput): { what: string; who: string; geos: string; sizes: string; revenue: string; combined: string } {
  const what = input.what_sold?.trim() || input.description?.trim() || '';
  const who = input.who_sold_to?.trim() || '';
  const geos = (input.countries ?? []).join(', ') || '(agent choice)';
  const sizes = (input.company_sizes ?? []).join(', ') || '(agent choice)';
  const revenue = (input.revenue_ranges ?? []).join(', ') || '(not specified)';
  const revenueLine = revenue === '(not specified)' ? '' : `\nAnnual revenue: ${revenue}`;
  const combined = input.who_sold_to
    ? `What I sell:\n${what}\n\nWho I sell to:\n${who}\n\nGeographic focus: ${geos}\nCompany size: ${sizes}${revenueLine}`
    : `Sales target description:\n${what || input.description}\n\nGeographic focus: ${geos}\nCompany size: ${sizes}${revenueLine}`;
  return { what, who, geos, sizes, revenue, combined };
}

export async function generateVertical(input: GenerateInput): Promise<GeneratedVertical> {
  const summary = summarizeInput(input);
  const log = (message: string, type: 'agent_step' | 'info' | 'error' = 'agent_step') =>
    logActivity({ run_id: input.run_id ?? null, type, message });

  await log(`🛠️ Vertical-builder agent received: "${summary.what.slice(0, 80)}${summary.what.length > 80 ? '…' : ''}"`);

  // ──── Step 1: ICP analysis ─────────────────────────────────────────
  await log('🔍 Step 1/5 — Analyzing ICP (titles, sizes, geos, industries)');
  const icp = await callClaudeJSON<z.infer<typeof IcpSchema>>({
    system: `You are a B2B sales-operations strategist defining a precise ICP for an autonomous sales agent.

The operator told you:
${summary.combined}

Return ONLY a JSON object with this exact shape:
{
  "titles": [string],              // 5-10 concrete buyer titles, specific. Avoid 'Sales Leader' (too vague).
  "titles_exclude": [string],      // e.g. ['Junior', 'Assistant', 'Intern', 'Student']
  "company_size_range": [int, int],// employee count range, inferred from input
  "countries": [string],           // full country names. If operator specified a region (e.g. 'DACH'), expand it (Germany, Austria, Switzerland)
  "industries": [string],          // specific industries that match the description
  "company_exclusions": [string]   // domains/names of mega-companies to skip (e.g. 'openai.com' for AI vertical)
}

Be SPECIFIC. Lean toward including more titles than fewer (5-10), but reject vague ones.`,
    user: 'Return the ICP JSON now.',
    maxTokens: 1200,
    temperature: 0.3,
  });
  const icpParsed = IcpSchema.parse(icp);
  // Persist the operator's revenue_ranges input straight onto the ICP so it
  // surfaces on the verticals listing + detail pages. The LLM doesn't get
  // a say here — this is structured operator intent.
  if (input.revenue_ranges && input.revenue_ranges.length > 0) {
    icpParsed.revenue_range = input.revenue_ranges;
  }
  await log(
    `   · Titles: ${icpParsed.titles.slice(0, 4).join(', ')}${icpParsed.titles.length > 4 ? ` (+${icpParsed.titles.length - 4} more)` : ''}`
  );
  await log(`   · Size: ${icpParsed.company_size_range[0]}–${icpParsed.company_size_range[1]} employees · Geos: ${icpParsed.countries.slice(0, 4).join(', ')}${icpParsed.revenue_range.length ? ` · ARR: ${icpParsed.revenue_range.join(', ')}` : ''}`);

  // ──── Steps 2/3/4: Signal sources + Persona + Voice (in parallel) ────
  // These three branches only depend on the ICP, so we fan them out to cut
  // wall-clock latency from ~30s sequential down to ~10s.
  await log('🪢 Steps 2-4/5 — Fanning out: signal sources + persona + voice (parallel)');

  const [signalRaw, personaRaw, voiceRaw] = await Promise.all([
    callClaudeJSON<z.infer<typeof SignalSourceSchema>>({
      system: `You are picking signal sources for an autonomous sales agent.

The operator targets:
${summary.combined}

ICP we just locked:
- Titles: ${icpParsed.titles.join(', ')}
- Industries: ${icpParsed.industries.join(', ')}
- Countries: ${icpParsed.countries.join(', ')}

CONSTRAINTS — the agent can ONLY scrape these three source types, do not invent others. Sources that don't match one of these will be SILENTLY DROPPED at runtime:
- RSS / Atom feed — any public RSS URL (TechCrunch, ProductHunt, industry blogs, sector trade publications, government feeds). Provide the full feed URL.
- Reddit JSON — any subreddit page. URL must be of the form https://www.reddit.com/r/<subreddit>/  (or /top/, /hot/). The scraper auto-appends .json.
- Hacker News API — name MUST include "Hacker News". No URL needed; the scraper hits the public Firebase API.

IMPORTANT — the agent ALSO performs a live web search on every run, picking its own queries from this vertical's ICP + relevance prompt. Do NOT add a "web search" or "Google" source entry — it's automatic. Use this slot list for stable, deterministic feeds only.

Pick 3-5 sources that will produce FREQUENT events likely to trigger buyer urgency. Each non-HN entry needs a 'name' and a 'url'. Mix source types — at least one RSS feed and, where the audience hangs out on Reddit (engineers, security, finance, HR, etc.), at least one subreddit.

Reddit subreddit examples by audience: r/sysadmin / r/netsec / r/cybersecurity for IT/security buyers; r/recruiting / r/cscareerquestions for talent buyers; r/CommercialAV / r/devops / r/sales for ops/sales buyers; r/freightbrokers / r/logistics for freight. Pick one that genuinely matches our ICP.

Also write a 'relevance_prompt' — a question the agent will ask itself per signal to score it. Format: "Is this event likely to create urgency for [our ICP] to seek [our offering] in the next 30 days?"

Return ONLY a JSON object:
{
  "type": "composite",
  "sources": [
    { "name": "TechCrunch RSS", "url": "https://techcrunch.com/feed/" },
    { "name": "r/sysadmin (Reddit)", "url": "https://www.reddit.com/r/sysadmin/top/" },
    { "name": "Hacker News top" }
  ],
  "relevance_prompt": "Is this event likely to..."
}`,
      user: 'Return the signal sources JSON now.',
      maxTokens: 1500,
      temperature: 0.4,
    }),
    callClaudeJSON<{ chain_builder_persona: string }>({
      system: `You are crafting the system-prompt persona for an autonomous reasoning agent that will read scraped signals and build "consequence chains" — i.e., reason from a world event to which specific buyers will feel urgency next.

The operator targets:
${summary.combined}

ICP titles: ${icpParsed.titles.join(', ')}
ICP industries: ${icpParsed.industries.join(', ')}

Write ONE paragraph (4-7 sentences, no line breaks) for the chain-builder persona. Frame it as:
"You are a senior <expertise> with N years covering <domain>. You connect <event types> to <downstream consequences> and to <ICP profile>. You think in cascades: event → first-order disruption → second-order pressure → buyer urgency. You always cite the specific event you're reasoning from. You write for <audience characteristic>."

Be CONCRETE. Mention specific event types relevant to this vertical.

Return ONLY: { "chain_builder_persona": "..." }`,
      user: 'Return the persona JSON now.',
      maxTokens: 800,
      temperature: 0.5,
    }),
    callClaudeJSON<z.infer<typeof VoiceSchema>>({
      system: `You are defining the script voice for outbound calls/emails to:
${summary.combined}

ICP titles: ${icpParsed.titles.join(', ')}
Industries: ${icpParsed.industries.join(', ')}

The voice should reflect the actual culture of the audience. Developers hate fluff. Founders hate jargon. Brokers want peer-to-peer. CISOs want compliance-fluent. Lawyers want precision. etc.

Return JSON:
{
  "tone": "<one sentence describing tone>",
  "anchor_phrases": [ "<phrase 1>", "<phrase 2>" ],  // 1-2 phrases the agent MUST use verbatim in openers
  "forbidden_phrases": [ "<phrase 1>", ... ],         // 3-6 phrases the agent must NEVER use (corporate jargon, etc.)
  "pricing_policy": "never_mention" | "on_request" | "open"  // when to discuss pricing
}`,
      user: 'Return the voice JSON now.',
      maxTokens: 700,
      temperature: 0.5,
      model: 'claude-haiku-4-5',
    }),
  ]);

  const signalParsed = SignalSourceSchema.parse({ ...signalRaw, type: 'composite' });
  await log(`   · Sources: ${signalParsed.sources.map((s) => s.name).join(', ')}`);
  const persona = personaRaw.chain_builder_persona ?? '';
  if (!persona) throw new Error('Persona step returned no chain_builder_persona text');
  await log(`   · Persona: "${persona.slice(0, 90)}${persona.length > 90 ? '…' : ''}"`);
  const voiceParsed = VoiceSchema.parse(voiceRaw);
  await log(`   · Tone: "${voiceParsed.tone.slice(0, 60)}…" — anchors: ${voiceParsed.anchor_phrases.length}, forbidden: ${voiceParsed.forbidden_phrases.length}`);

  // ──── Step 5: Self-critique ─────────────────────────────────────
  await log('🪞 Step 5/5 — Self-critique pass: looking for inconsistencies or assumptions');
  const partialConfig = {
    icp: icpParsed,
    signal_source: signalParsed,
    chain_builder_persona: persona,
    script_voice: voiceParsed,
  };
  const critique = await callClaudeJSON<{ warnings: string[]; display_name: string; slug: string; short_summary: string; rationale: string }>({
    system: `You generated a vertical config below. Now critique it. Surface any:
- Assumptions you made because the operator's description was ambiguous
- Risks (titles inconsistent with company size, sources that may not exist for this niche, etc.)
- Gaps the operator should know about

ALSO produce:
- display_name: short human-readable name (e.g. "Healthcare CISO Outreach")
- slug: kebab-case identifier (e.g. "healthcare-ciso")
- short_summary: ONE sentence (15-25 words max) — the elevator pitch of who this vertical targets and why. Used as the headline on the review screen. NO buzzwords.
- rationale: ONE paragraph (2-4 sentences) explaining your top choices — readable to a non-technical operator

Operator input:
${summary.combined}

Generated config so far:
${JSON.stringify(partialConfig, null, 2)}

Return JSON:
{
  "display_name": "...",
  "slug": "...",
  "short_summary": "...",
  "rationale": "...",
  "warnings": [ "<warning 1>", ... ]   // empty array if none
}`,
    user: 'Critique and return the JSON now. You MUST include display_name, slug, rationale, and warnings fields — all four, every time.',
    maxTokens: 1500,
    temperature: 0.3,
  });
  // Defensive defaults — if Claude ever omits any field, fall back to derived
  // values so the run completes instead of crashing at final assembly.
  const critiqueWarnings = Array.isArray(critique.warnings) ? critique.warnings : [];
  const fallbackName = (input.what_sold || input.description || 'Custom Vertical').slice(0, 40).trim();
  const display_name = (typeof critique.display_name === 'string' && critique.display_name.trim()) || fallbackName;
  const slug = (typeof critique.slug === 'string' && critique.slug.trim()) || display_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'custom-vertical';
  const rationale = (typeof critique.rationale === 'string' && critique.rationale.trim()) || `Targets ${icpParsed.titles.slice(0, 3).join(', ')} at ${icpParsed.company_size_range[0]}-${icpParsed.company_size_range[1]} employee companies in ${icpParsed.countries.slice(0, 3).join(', ')}.`;
  const short_summary =
    (typeof critique.short_summary === 'string' && critique.short_summary.trim()) ||
    rationale.split(/[.!?](?:\s|$)/)[0]?.trim() ||
    `${icpParsed.titles[0] ?? 'Buyers'} at ${icpParsed.company_size_range[0]}–${icpParsed.company_size_range[1]} employee companies`;
  await log(`   · ${critiqueWarnings.length === 0 ? 'No warnings — config looks consistent' : `${critiqueWarnings.length} warning(s) flagged`}`);

  // ──── Final assembly ────────────────────────────────────────────
  const generated: GeneratedVertical = ResponseSchema.parse({
    display_name,
    slug,
    config: {
      ...partialConfig,
      crm: { hubspot_pipeline_id: null, custom_fields: {} },
      cron_time: '07:00',
      timezone: 'Europe/Berlin',
      target_daily_leads: 15,
    },
    short_summary,
    rationale,
    warnings: critiqueWarnings,
  });

  await log(
    `✅ Vertical "${generated.display_name}" assembled — ${generated.config.icp.titles.length} titles, ${generated.config.signal_source.sources.length} sources, ${generated.warnings.length} warnings`
  );

  return generated;
}

// ──────────────────────────────────────────────────────────────
// REFINEMENT — used by the wizard's chat-based iteration loop.
// ──────────────────────────────────────────────────────────────

export interface RefinementInput {
  previous_config: GeneratedVertical;
  refinement_message: string;
  resolved_considerations?: { text: string; action: 'applied' | 'dismissed' }[];
  run_id?: string;
}

export type RefinementResult =
  | { kind: 'updated'; generated: GeneratedVertical; changes_summary: string; changed_fields: string[] }
  | { kind: 'clarification'; clarification_question: string };

const RefinementResponseSchema = z.union([
  z.object({
    clarification_needed: z.string().min(5),
  }),
  z.object({
    changes_summary: z.string().min(5),
    changed_fields: z.array(z.string()).default([]),
    updated: ResponseSchema,
  }),
]);

export async function refineVertical(input: RefinementInput): Promise<RefinementResult> {
  const log = (message: string, type: 'agent_step' | 'info' | 'error' = 'agent_step') =>
    logActivity({ run_id: input.run_id ?? null, type, message });

  await log(`🔄 Refinement requested: "${input.refinement_message.slice(0, 100)}${input.refinement_message.length > 100 ? '…' : ''}"`);

  const resolved = input.resolved_considerations ?? [];
  const resolvedBlock = resolved.length
    ? `\n\nPREVIOUSLY RESOLVED CONSIDERATIONS — the operator has already acted on these. DO NOT re-flag them in the new warnings list unless something materially new has emerged. Treat applied items as intentional choices, and dismissed items as deliberately accepted trade-offs:\n${resolved
        .map((r, i) => `${i + 1}. [${r.action.toUpperCase()}] ${r.text}`)
        .join('\n')}`
    : '';

  const result = await callClaudeJSON<unknown>({
    system: `You are an autonomous sales-operations agent collaborating with an operator to refine a vertical config.

CURRENT CONFIG (do not change anything not explicitly requested by the operator):
${JSON.stringify(input.previous_config, null, 2)}${resolvedBlock}

GUARDRAILS:
1. ONLY change fields the operator explicitly mentions. Leave everything else byte-identical.
2. Prefer adding/expanding over replacing (e.g. "add Germany" = append, not overwrite).
3. If the operator's request doesn't make commercial sense for this vertical (e.g. asking for 16-year-old buyers in a B2B context, asking for free pricing on enterprise software), DO NOT comply silently. Instead ask a clarifying question.
4. Always return changes_summary describing what changed in plain English.
5. Always return changed_fields listing the JSON paths that changed (e.g. ['config.icp.titles', 'config.icp.countries']).
6. WARNINGS LIST: only include NEW concerns that emerged from this change. Do not re-raise concerns the operator already applied or dismissed (see "PREVIOUSLY RESOLVED CONSIDERATIONS" above). If there are no genuinely new concerns, return an empty warnings array.

Return EXACTLY ONE of these two JSON shapes:

If the request makes sense:
{
  "changes_summary": "<one sentence describing what changed>",
  "changed_fields": [ "config.icp.titles", "config.icp.countries" ],
  "updated": { <full updated GeneratedVertical with display_name, slug, config, rationale, warnings> }
}

If the request needs clarification or pushback:
{
  "clarification_needed": "<one short question to the operator>"
}

Operator's refinement:
${input.refinement_message}`,
    user: 'Apply the refinement and return JSON now.',
    maxTokens: 4000,
    temperature: 0.3,
  });

  // Try strict parse first; on failure, deep-merge the response into the
  // previous_config so any missing/malformed fields fall back to known-good
  // values. This makes refinement resilient to small agent omissions instead
  // of erroring out after a 20s round-trip.
  let parsed: z.infer<typeof RefinementResponseSchema>;
  const strictAttempt = RefinementResponseSchema.safeParse(result);
  if (strictAttempt.success) {
    parsed = strictAttempt.data;
  } else if (result && typeof result === 'object' && 'updated' in result) {
    const merged = {
      ...(result as Record<string, unknown>),
      updated: deepMerge(input.previous_config as unknown as Record<string, unknown>, (result as { updated: unknown }).updated as Record<string, unknown>),
    };
    const retry = RefinementResponseSchema.safeParse(merged);
    if (!retry.success) {
      await log(`⚠ Refinement response failed validation even after merge — falling back to clarification`);
      return { kind: 'clarification', clarification_question: 'I had trouble producing a valid update. Could you rephrase your request?' };
    }
    parsed = retry.data;
  } else if (
    result &&
    typeof result === 'object' &&
    'clarification_needed' in result &&
    typeof (result as { clarification_needed: unknown }).clarification_needed === 'string' &&
    ((result as { clarification_needed: string }).clarification_needed).trim().length >= 5
  ) {
    parsed = {
      clarification_needed: (result as { clarification_needed: string }).clarification_needed.trim(),
    };
  } else {
    await log(`⚠ Refinement response had unrecognized shape — asking operator to rephrase`);
    return { kind: 'clarification', clarification_question: 'I had trouble producing a valid update. Could you rephrase your request?' };
  }

  if ('clarification_needed' in parsed) {
    await log(`❓ Agent needs clarification: "${parsed.clarification_needed}"`);
    return { kind: 'clarification', clarification_question: parsed.clarification_needed };
  }

  await log(`   · ${parsed.changes_summary}`);
  await log(`   · Changed: ${parsed.changed_fields.join(', ') || '(reported but unspecified)'}`);
  return {
    kind: 'updated',
    generated: parsed.updated,
    changes_summary: parsed.changes_summary,
    changed_fields: parsed.changed_fields,
  };
}

// ──────────────────────────────────────────────────────────────
// BRAIN PRE-SEED — generate plausible initial insights for a new vertical
// so first runs don't show "Loaded 0 brain insights" in the streaming UI.
// ──────────────────────────────────────────────────────────────

const BrainSeedSchema = z.object({
  entries: z
    .array(
      z.object({
        type: z.enum([
          'angle_landed',
          'angle_failed',
          'objection_recurring',
          'profile_chase',
          'profile_avoid',
          'manual_insight',
        ]),
        content: z.string().min(20),
        weight: z.number().min(0.5).max(2.0).default(1.0),
      })
    )
    .min(3)
    .max(6),
});

export async function generateBrainSeed(vertical: GeneratedVertical): Promise<z.infer<typeof BrainSeedSchema>['entries']> {
  const result = await callClaudeJSON<z.infer<typeof BrainSeedSchema>>({
    system: `You are seeding initial sales-ops "brain" insights for a freshly created vertical so the agent's first runs feel informed rather than naive.

Vertical: ${vertical.display_name}
ICP: ${vertical.config.icp.titles.join(', ')} at ${vertical.config.icp.company_size_range[0]}–${vertical.config.icp.company_size_range[1]}-employee ${vertical.config.icp.industries.join('/')} companies
Persona: ${vertical.config.chain_builder_persona.slice(0, 300)}…
Voice: ${vertical.config.script_voice.tone}

Generate 3-5 PLAUSIBLE initial brain insights this agent would learn after ~10 calls — landed angles, failed angles, recurring objections, profiles to chase or avoid. Each should be specific to this vertical, NOT generic.

Return JSON:
{
  "entries": [
    { "type": "angle_landed", "content": "<specific insight>", "weight": 1.0 },
    { "type": "objection_recurring", "content": "<specific objection these buyers raise>", "weight": 1.0 },
    { "type": "profile_chase", "content": "<specific sub-segment that converts well>", "weight": 1.2 }
  ]
}`,
    user: 'Return the seed brain entries JSON now.',
    maxTokens: 1500,
    temperature: 0.5,
  });
  const parsed = BrainSeedSchema.parse(result);
  return parsed.entries;
}

export type { VerticalConfig };
