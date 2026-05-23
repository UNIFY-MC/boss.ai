// Twilio webhooks: call-status (lifecycle updates for the UI) +
// recording-ready (kicks off Speechmatics → Brain).
//
// These routes are exempt from the shared-secret guard in index.ts and validate
// Twilio's X-Twilio-Signature header instead.

import type { FastifyInstance } from 'fastify';
import twilioModule from 'twilio';
import { env } from '../lib/env';
import { supabase } from '../lib/supabase';
import { fetchRecording } from '../telephony/twilio';
import { transcribeAudio } from '../audio/transcribe';
import { loadVertical } from '../pipeline/load-vertical';
import { extractBrainEntries } from '../brain/extract';
import { persistExtraction } from '../brain/ingest';
import { SecurityFlagError } from '../llm/lobster-trap';
import { logActivity } from '../lib/activity-log';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

const STATUS_MAP: Record<string, string> = {
  initiated: 'initiated',
  ringing: 'ringing',
  'in-progress': 'in_progress',
  answered: 'in_progress',
  completed: 'completed',
  busy: 'busy',
  'no-answer': 'no_answer',
  failed: 'failed',
  canceled: 'canceled',
};

function validateTwilioSignature(req: any): boolean {
  if (!env.TWILIO_AUTH_TOKEN) return false;
  const signature = req.headers['x-twilio-signature'];
  if (!signature || typeof signature !== 'string') return false;

  const protocol = (req.headers['x-forwarded-proto'] as string) ?? 'https';
  const host = (req.headers['x-forwarded-host'] as string) ?? req.headers.host;
  const url = `${protocol}://${host}${req.url}`;

  // For application/x-www-form-urlencoded bodies (Twilio default)
  const params = (req.body ?? {}) as Record<string, string>;
  return twilioModule.validateRequest(env.TWILIO_AUTH_TOKEN, signature, url, params);
}

export async function twilioWebhookRoutes(app: FastifyInstance) {
  // POST /twilio/call-status — lifecycle events for the cockpit UI
  app.post('/twilio/call-status', async (req: any, reply) => {
    if (!validateTwilioSignature(req)) {
      app.log.warn('Twilio signature validation failed on /call-status');
      return reply.code(403).send('forbidden');
    }

    const body = req.body as Record<string, string>;
    const call_sid = body.CallSid;
    const status_raw = body.CallStatus;
    if (!call_sid || !status_raw) return reply.code(200).send('ok');

    const mapped = STATUS_MAP[status_raw] ?? 'in_progress';

    const { data: existing } = await supabase()
      .from('calls')
      .select('id, lead_id, vertical_id, status')
      .eq('twilio_call_sid', call_sid)
      .single();

    const patch: Record<string, unknown> = { status: mapped };
    if (mapped === 'completed' || mapped === 'failed' || mapped === 'no_answer' || mapped === 'busy' || mapped === 'canceled') {
      patch.ended_at = new Date().toISOString();
    }
    if (body.CallDuration) patch.recording_duration_seconds = Number(body.CallDuration);

    await supabase().from('calls').update(patch).eq('twilio_call_sid', call_sid);

    if (existing && existing.status !== mapped) {
      const lookup: Record<string, string> = {
        ringing: '☎️ Your cell is ringing…',
        in_progress: '🎙️ Call connected — recording',
        completed: '✓ Call ended — fetching recording',
        no_answer: '☎️ No answer',
        busy: '☎️ Lead was busy',
        failed: '❌ Call failed',
        canceled: '↪ Call canceled',
      };
      const msg = lookup[mapped];
      if (msg) {
        await logActivity({
          vertical_id: existing.vertical_id,
          lead_id: existing.lead_id,
          type: 'agent_step',
          message: msg,
          metadata: { call_sid },
        });
      }
    }

    return reply.code(200).send('ok');
  });

  // POST /twilio/recording-ready — recording uploaded, kick off transcription
  app.post('/twilio/recording-ready', async (req: any, reply) => {
    if (!validateTwilioSignature(req)) {
      app.log.warn('Twilio signature validation failed on /recording-ready');
      return reply.code(403).send('forbidden');
    }

    const body = req.body as Record<string, string>;
    const call_sid = body.CallSid;
    const recording_sid = body.RecordingSid;
    const recording_url = body.RecordingUrl;
    const duration = body.RecordingDuration ? Number(body.RecordingDuration) : null;

    if (!call_sid || !recording_url) {
      app.log.warn({ body }, 'recording-ready missing fields');
      return reply.code(200).send('ok');
    }

    const { data: callRow } = await supabase()
      .from('calls')
      .select('id, lead_id, vertical_id, lead_phone')
      .eq('twilio_call_sid', call_sid)
      .single();

    if (!callRow) {
      app.log.warn({ call_sid }, 'recording-ready: no calls row found');
      return reply.code(200).send('ok');
    }

    await supabase()
      .from('calls')
      .update({
        twilio_recording_sid: recording_sid,
        recording_url,
        recording_duration_seconds: duration,
      })
      .eq('id', callRow.id);

    await logActivity({
      vertical_id: callRow.vertical_id,
      lead_id: callRow.lead_id,
      type: 'agent_step',
      message: `🎙️ Transcribing call (${duration ?? '?'}s) via Speechmatics…`,
      metadata: { call_sid, recording_sid },
    });

    // Background: download → transcribe → ingest
    void (async () => {
      try {
        // Twilio recording URLs require HTTP Basic auth that Speechmatics
        // and Whisper don't forward. Fetch the audio into a buffer first
        // and pass that to the transcription dispatcher.
        const audioBuf = await fetchRecording(recording_url);
        const tmpPath = join(tmpdir(), `twilio-${call_sid}.mp3`);
        await writeFile(tmpPath, audioBuf);

        const { transcribeBuffer } = await import('../audio/transcribe');
        const { text, provider } = await transcribeBuffer(audioBuf, 'mp3');

        await unlink(tmpPath).catch(() => {});

        // Insert transcripts row
        const vertical = await loadVertical(callRow.vertical_id);
        const { data: txRow, error: txErr } = await supabase()
          .from('transcripts')
          .insert({
            lead_id: callRow.lead_id,
            vertical_id: callRow.vertical_id,
            raw_text: text,
            audio_url: recording_url,
            audio_provider: provider,
            source: 'twilio_call',
            twilio_call_sid: call_sid,
            match_confidence: 'high', // we dialed, we know
          })
          .select('id')
          .single();
        if (txErr || !txRow) {
          throw new Error(`transcript insert failed: ${txErr?.message}`);
        }

        // Link calls.transcript_id
        await supabase().from('calls').update({ transcript_id: txRow.id }).eq('id', callRow.id);

        const { data: lead } = await supabase()
          .from('leads')
          .select('id, name, company, title')
          .eq('id', callRow.lead_id!)
          .single();

        // Extract + ingest
        const extraction = await extractBrainEntries({
          transcript_text: text,
          vertical,
          lead: lead ?? null,
          source_ref: txRow.id,
        });
        await persistExtraction({
          extraction,
          vertical_id: callRow.vertical_id!,
          lead_id: callRow.lead_id ?? null,
          transcript_id: txRow.id,
          source: 'transcript',
        });

        await supabase().from('calls').update({ transcribed: true }).eq('id', callRow.id);
      } catch (err) {
        if (err instanceof SecurityFlagError) {
          await logActivity({
            vertical_id: callRow.vertical_id,
            lead_id: callRow.lead_id,
            type: 'security_flag',
            message: `🛡️ Call transcript flagged by Lobster Trap — not ingested`,
          });
        } else {
          app.log.error({ err, call_sid }, 'recording-ready pipeline failed');
          await logActivity({
            vertical_id: callRow.vertical_id,
            lead_id: callRow.lead_id,
            type: 'error',
            message: `❌ Call transcription failed: ${(err as Error).message}`,
          });
        }
      }
    })();

    return reply.code(200).send('ok');
  });
}
