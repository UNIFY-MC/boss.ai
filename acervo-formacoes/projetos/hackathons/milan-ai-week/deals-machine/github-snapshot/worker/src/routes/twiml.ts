// GET /twiml/dial — serves the TwiML that Twilio fetches when the operator
// answers their cell. Tells Twilio to bridge to the lead and record.
//
// Caller ID is the operator's verified cell so the lead sees a familiar
// number (high pickup rates). Recording uses "record-from-answer-dual" so
// both legs are captured separately for clean speaker diarization; the
// recordingStatusCallback fires our worker on upload completion.

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { env } from '../lib/env';

const DialQuery = z.object({
  to: z.string().min(8),
  caller_id: z.string().min(8),
  call_id: z.string().uuid().optional(), // our internal calls.id for the webhook to find
});

export async function twimlRoutes(app: FastifyInstance) {
  // Twilio fetches via POST OR GET — we handle both.
  const handler = async (req: any, reply: any) => {
    const params = { ...req.query, ...req.body };
    const parsed = DialQuery.safeParse(params);
    if (!parsed.success) {
      reply.code(400).type('application/xml').send(
        `<?xml version="1.0" encoding="UTF-8"?><Response><Say>Invalid dial parameters.</Say><Hangup/></Response>`
      );
      return;
    }
    const { to, caller_id, call_id } = parsed.data;

    const base = env.TWILIO_WEBHOOK_BASE.replace(/\/$/, '');
    const recordingCallback =
      `${base}/twilio/recording-ready${call_id ? `?call_id=${call_id}` : ''}`;

    // Convert https://worker.kyletdow.com → wss://worker.kyletdow.com
    const wsBase = base.replace(/^http/, 'ws');
    const streamUrl = `${wsBase}/twilio/media-stream${call_id ? `?call_id=${call_id}` : ''}`;

    // <Start><Stream> runs concurrent with <Dial>. The stream gets both
    // legs of the call (bidirectional). Speechmatics transcribes in real time
    // and the worker fires coaching events into live_coaching_events.
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Start>
    <Stream url="${escapeXml(streamUrl)}" track="both_tracks"/>
  </Start>
  <Dial callerId="${escapeXml(caller_id)}" timeout="40" record="record-from-answer-dual" recordingStatusCallback="${escapeXml(recordingCallback)}" recordingStatusCallbackMethod="POST" recordingStatusCallbackEvent="completed">
    <Number>${escapeXml(to)}</Number>
  </Dial>
</Response>`;

    reply.type('application/xml').send(xml);
  };

  app.get('/twiml/dial', handler);
  app.post('/twiml/dial', handler);
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
