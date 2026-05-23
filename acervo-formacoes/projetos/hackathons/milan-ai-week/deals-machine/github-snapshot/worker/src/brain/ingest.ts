// Brain ingestion: take an Extraction object and persist it.
//
// - Inserts one brain_entries row per discovered insight (typed)
// - Updates leads.memory_summary if a lead is associated
// - Marks the transcript row as processed=true
// - Writes a single rolled-up activity_log entry

import { supabase } from '../lib/supabase';
import { logActivity } from '../lib/activity-log';
import type { Extraction } from './extract';
import { draftFollowUpEmail } from './draft-email';

export interface IngestArgs {
  extraction: Extraction;
  vertical_id: string;
  lead_id?: string | null;
  transcript_id: string;
  source: 'transcript' | 'manual' | 'document' | 'brain';
}

export async function persistExtraction(args: IngestArgs): Promise<{ inserted: number }> {
  const rows: Array<{
    vertical_id: string;
    type: string;
    content: string;
    evidence_quote?: string | null;
    weight: number;
    source: string;
    source_ref: string;
    lead_id: string | null;
  }> = [];

  const make = (type: string, content: string, evidence?: string) => ({
    vertical_id: args.vertical_id,
    type,
    content,
    evidence_quote: evidence ?? null,
    weight: 1.0,
    source: args.source,
    source_ref: args.transcript_id,
    lead_id: args.lead_id ?? null,
  });

  for (const a of args.extraction.angles_landed) rows.push(make('angle_landed', a.description, a.evidence_quote));
  for (const a of args.extraction.angles_failed) rows.push(make('angle_failed', a.description, a.evidence_quote));
  for (const o of args.extraction.objections) rows.push(make('objection_recurring', o.description, o.evidence_quote));
  for (const c of args.extraction.commitments)
    rows.push(make('commitment_made', `${c.description}${c.deadline ? ` (by ${c.deadline})` : ''}`));
  for (const d of args.extraction.deal_killers) rows.push(make('deal_killer', d.description, d.evidence_quote));
  for (const p of args.extraction.profile_signals) {
    rows.push(make(p.type === 'chase' ? 'profile_chase' : 'profile_avoid', p.description, p.reasoning));
  }

  if (rows.length > 0) {
    const { error } = await supabase().from('brain_entries').insert(rows);
    if (error) {
      await logActivity({
        vertical_id: args.vertical_id,
        lead_id: args.lead_id ?? null,
        type: 'error',
        message: `❌ Brain insert failed: ${error.message}`,
      });
    }
  }

  if (args.lead_id) {
    await supabase()
      .from('leads')
      .update({ memory_summary: args.extraction.memory_summary })
      .eq('id', args.lead_id);
  }

  await supabase()
    .from('transcripts')
    .update({ processed: true })
    .eq('id', args.transcript_id);

  // Pre-emptive follow-up email draft. Runs only on transcripts (chat/manual
  // ingest paths don't represent a phone call → no follow-up to send). Fully
  // async + best-effort: never blocks ingest completion.
  if (args.lead_id && args.source === 'transcript') {
    try {
      const { data: lead } = await supabase()
        .from('leads')
        .select('id, vertical_id, name, title, company, email, memory_summary')
        .eq('id', args.lead_id)
        .single();
      const { data: vertical } = await supabase()
        .from('verticals')
        .select('id, slug, display_name, config, active, created_at')
        .eq('id', args.vertical_id)
        .single();
      if (lead && vertical) {
        await draftFollowUpEmail({
          lead: { ...lead, vertical_id: args.vertical_id },
          vertical: vertical as unknown as Parameters<typeof draftFollowUpEmail>[0]['vertical'],
          transcript_id: args.transcript_id,
          senderName: process.env.OPERATOR_NAME || 'Kyle Dow',
          senderCompany: process.env.OPERATOR_COMPANY || 'Deals Machine',
        });
      }
    } catch (err) {
      console.error('[ingest] auto-draft step failed:', (err as Error).message);
    }
  }

  await logActivity({
    vertical_id: args.vertical_id,
    lead_id: args.lead_id ?? null,
    type: 'transcript_ingest',
    message: `🧠 Brain learned ${rows.length} insight${rows.length === 1 ? '' : 's'} — "${args.extraction.memory_summary}"`,
    metadata: {
      counts: {
        angles_landed: args.extraction.angles_landed.length,
        angles_failed: args.extraction.angles_failed.length,
        objections: args.extraction.objections.length,
        commitments: args.extraction.commitments.length,
        deal_killers: args.extraction.deal_killers.length,
        profile_signals: args.extraction.profile_signals.length,
      },
    },
  });

  return { inserted: rows.length };
}
