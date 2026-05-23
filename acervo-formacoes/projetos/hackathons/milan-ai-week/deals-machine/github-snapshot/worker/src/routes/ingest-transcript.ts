import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import { loadVertical } from '../pipeline/load-vertical';
import { transcribeAudio } from '../audio/transcribe';
import { extractBrainEntries } from '../brain/extract';
import { persistExtraction } from '../brain/ingest';
import { SecurityFlagError } from '../llm/lobster-trap';
import { logActivity } from '../lib/activity-log';

const IngestBody = z
  .object({
    lead_id: z.string().uuid().optional(),
    vertical_id: z.string().uuid(),
    text: z.string().min(1).optional(),
    audio_url: z.string().url().optional(),
    source: z
      .enum(['text_paste', 'audio_upload', 'fireflies_auto'])
      .default('text_paste'),
  })
  .refine((v) => Boolean(v.text || v.audio_url), { message: 'either text or audio_url required' });

/**
 * POST /ingest-transcript — Feature B (Brain learning).
 *
 * Ingestion sources:
 *   1. text_paste (cockpit modal)
 *   2. audio_upload (cockpit modal → Speechmatics → Whisper fallback)
 *   3. fireflies_auto (internal caller for meeting pickup)
 *
 * Flow:
 *   1. Persist transcripts row
 *   2. If audio: transcribe via Speechmatics (Whisper fallback)
 *   3. Pre-flight through Lobster Trap (inside extractBrainEntries via trusted-client)
 *   4. Extract structured Brain entries via Claude
 *   5. Insert brain_entries + update lead.memory_summary + mark processed
 *   6. Write rolled-up activity_log row
 */
export async function ingestTranscriptRoute(app: FastifyInstance) {
  app.post('/ingest-transcript', async (req, reply) => {
    const parsed = IngestBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'invalid_body', details: parsed.error.format() });
    }
    const { lead_id, vertical_id, text, audio_url, source } = parsed.data;

    // Load vertical (we need its display_name for the extraction prompt)
    let vertical;
    try {
      vertical = await loadVertical(vertical_id);
    } catch (err) {
      return reply.code(404).send({ error: 'vertical_not_found', message: (err as Error).message });
    }

    // Step 1: Insert transcripts row up-front so we have an ID for downstream refs
    const { data: txRow, error: txErr } = await supabase()
      .from('transcripts')
      .insert({
        lead_id: lead_id ?? null,
        vertical_id,
        raw_text: text ?? '(pending audio transcription)',
        audio_url: audio_url ?? null,
        source,
        match_confidence: lead_id ? 'high' : 'unmatched',
      })
      .select('id')
      .single();
    if (txErr || !txRow) {
      return reply.code(500).send({ error: 'transcript_insert_failed', message: txErr?.message });
    }

    // Step 2: If audio, transcribe; update transcript row
    let transcriptText = text ?? '';
    let provider: 'speechmatics' | 'whisper' | null = null;
    if (audio_url) {
      try {
        const out = await transcribeAudio(audio_url);
        transcriptText = out.text;
        provider = out.provider;
        await supabase()
          .from('transcripts')
          .update({ raw_text: transcriptText, audio_provider: provider })
          .eq('id', txRow.id);
        await logActivity({
          vertical_id,
          lead_id: lead_id ?? null,
          type: 'agent_step',
          message: `🎙️ Transcribed audio via ${provider} (${transcriptText.length} chars)`,
        });
      } catch (err) {
        await logActivity({
          vertical_id,
          lead_id: lead_id ?? null,
          type: 'error',
          message: `❌ Audio transcription failed: ${(err as Error).message}`,
        });
        return reply.code(500).send({ error: 'transcription_failed', message: (err as Error).message });
      }
    }

    if (!transcriptText.trim()) {
      return reply.code(400).send({ error: 'empty_transcript' });
    }

    // Step 3-5: Extract + ingest. Lobster Trap pre-flights inside extractBrainEntries.
    // Look up lead context if we have an id
    let lead = null as null | { id: string; name?: string | null; company?: string | null; title?: string | null };
    if (lead_id) {
      const { data } = await supabase()
        .from('leads')
        .select('id, name, company, title')
        .eq('id', lead_id)
        .single();
      if (data) lead = data;
    }

    try {
      const extraction = await extractBrainEntries({
        transcript_text: transcriptText,
        vertical,
        lead,
        source_ref: txRow.id,
      });
      const ingested = await persistExtraction({
        extraction,
        vertical_id,
        lead_id: lead_id ?? null,
        transcript_id: txRow.id,
        source: 'transcript',
      });

      return reply.send({
        transcript_id: txRow.id,
        provider,
        inserted_brain_entries: ingested.inserted,
        memory_summary: extraction.memory_summary,
      });
    } catch (err) {
      if (err instanceof SecurityFlagError) {
        await supabase()
          .from('transcripts')
          .update({ flagged: true, processed: true })
          .eq('id', txRow.id);
        return reply.code(400).send({
          error: 'security_flagged',
          verdict: err.verdict,
          message: 'Transcript flagged by security middleware — content was not ingested into Brain',
        });
      }
      return reply.code(500).send({ error: 'ingest_failed', message: (err as Error).message });
    }
  });
}
