// Transcript → structured Brain entries.
//
// Brain ingestion.
// Input: raw transcript text (already cleaned by Lobster Trap).
// Output: structured insights (angles landed/failed, objections, commitments,
// deal-killers, profile signals) + a 1-line memory_summary for the lead.

import { z } from 'zod';
import { callClaudeTrustedJSON } from '../llm/trusted-client';
import type { VerticalRow } from '../pipeline/types';

const ExtractionSchema = z.object({
  angles_landed: z
    .array(z.object({ description: z.string(), evidence_quote: z.string().optional() }))
    .default([]),
  angles_failed: z
    .array(z.object({ description: z.string(), evidence_quote: z.string().optional() }))
    .default([]),
  objections: z
    .array(z.object({ description: z.string(), evidence_quote: z.string().optional() }))
    .default([]),
  commitments: z
    .array(z.object({ description: z.string(), deadline: z.string().optional() }))
    .default([]),
  deal_killers: z
    .array(z.object({ description: z.string(), evidence_quote: z.string().optional() }))
    .default([]),
  profile_signals: z
    .array(
      z.object({
        type: z.enum(['chase', 'avoid']),
        description: z.string(),
        reasoning: z.string().optional(),
      })
    )
    .default([]),
  memory_summary: z.string(),
});

export type Extraction = z.infer<typeof ExtractionSchema>;

export interface ExtractInput {
  transcript_text: string;
  vertical: VerticalRow;
  lead?: { id: string; name?: string | null; company?: string | null; title?: string | null } | null;
  source_ref?: string | null;
}

const SYSTEM_PROMPT = `You are a sales-call analyst extracting structured insights for a learning agent.
You are given a transcript of a sales call. Your job is to extract everything that should be stored
in the Brain so future runs of the agent can use what was learned.

Return a SINGLE JSON object — no markdown — with these keys:

- angles_landed: array of { description, evidence_quote } — framings/pitches that visibly resonated
- angles_failed: array of { description, evidence_quote } — framings that fell flat
- objections: array of { description, evidence_quote } — pushback raised by the lead
- commitments: array of { description, deadline } — anything the lead committed to (callbacks, meetings, intros)
- deal_killers: array of { description, evidence_quote } — disqualifiers (no budget, wrong size, do-not-call)
- profile_signals: array of { type: "chase"|"avoid", description, reasoning } — patterns about WHO to call (or not call) at similar companies/roles
- memory_summary: ONE short sentence (max 30 words) capturing what to remember for next time we talk to this lead

Be conservative. Empty arrays are fine when nothing of that type happened. Don't fabricate.
Quotes should be VERBATIM substrings from the transcript when present.`;

export async function extractBrainEntries(input: ExtractInput): Promise<Extraction> {
  const ctx = {
    source_type: 'transcript' as const,
    source_ref: input.source_ref ?? null,
    vertical_id: input.vertical.id,
    lead_id: input.lead?.id ?? null,
  };

  const leadHeader = input.lead
    ? `Lead: ${input.lead.name ?? '(unknown)'} — ${input.lead.title ?? ''} at ${input.lead.company ?? ''}`
    : 'Lead: unmatched';

  const user = `Vertical: ${input.vertical.display_name}
${leadHeader}

Transcript:
"""
${input.transcript_text}
"""

Return the JSON object now.`;

  const raw = await callClaudeTrustedJSON({
    system: SYSTEM_PROMPT,
    user,
    maxTokens: 4000,
    temperature: 0.2,
    untrustedText: input.transcript_text,
    ctx,
  });

  return ExtractionSchema.parse(raw);
}
