// Twilio Media Streams WebSocket handler.
//
// Twilio sends JSON-encoded frames over WSS:
//   { event: "connected" }                                   — handshake
//   { event: "start",  start: { callSid, streamSid, ... } }  — call started
//   { event: "media",  media: { track, payload (base64), ... } } — audio
//   { event: "stop" }                                        — call ended
//
// Per stream we:
//   1. Open a Speechmatics RT session
//   2. Pipe each media frame's payload (decoded mulaw bytes) → Speechmatics
//   3. Buffer partial+final transcripts in a rolling 30s window
//   4. Run CoachLoop every 5s on the rolling buffer
//   5. On stop: snapshot the current playbook onto calls.playbook_snapshot
//      and close everything

import type { WebSocket as WsType } from 'ws';
import { SpeechmaticsRtSession } from './speechmatics-rt';
import { CoachLoop, type CoachContext } from './coach-loop';
import { supabase } from '../lib/supabase';

interface TranscriptLine {
  ts: number;
  text: string;
  final: boolean;
}

const ROLLING_WINDOW_MS = 30_000;

export async function handleTwilioMediaStream(
  ws: WsType,
  query: { call_id?: string },
): Promise<void> {
  // call_id can come from EITHER the WSS URL query (?call_id=<uuid>) OR be
  // recovered from msg.start.callSid (Twilio's CallSid, which we stored on
  // calls.twilio_call_sid at call-initiate time). The URL path is the
  // primary; the callSid lookup is the fallback that fired here today
  // because the TwiML route wasn't being given a call_id at the time the
  // bridge call was created.
  let callId: string | null = query.call_id || null;
  let streamSid: string | null = null;
  let speechmatics: SpeechmaticsRtSession | null = null;
  let coach: CoachLoop | null = null;
  const transcript: TranscriptLine[] = [];

  const getTranscriptWindow = (): string => {
    const cutoff = Date.now() - ROLLING_WINDOW_MS;
    return transcript
      .filter((l) => l.ts >= cutoff)
      .map((l) => l.text)
      .join(' ');
  };

  const initContext = async (callSidFallback: string | null): Promise<CoachContext | null> => {
    const sb = supabase();
    let callRow: { id: string; lead_id: string; vertical_id: string } | null = null;

    if (callId) {
      const { data } = await sb
        .from('calls')
        .select('id, lead_id, vertical_id')
        .eq('id', callId)
        .maybeSingle();
      callRow = data ?? null;
    }

    // Fallback — find the calls row by Twilio's CallSid. Set on call-initiate
    // for every dial, so this should always resolve for a live call.
    if (!callRow && callSidFallback) {
      console.log(`[twilio-stream] call_id missing, looking up by twilio_call_sid=${callSidFallback}`);
      const { data } = await sb
        .from('calls')
        .select('id, lead_id, vertical_id')
        .eq('twilio_call_sid', callSidFallback)
        .maybeSingle();
      callRow = data ?? null;
      if (callRow) {
        callId = callRow.id;
        console.log(`[twilio-stream] resolved call_id=${callId} from CallSid`);
      } else {
        console.warn(`[twilio-stream] no calls row found for CallSid=${callSidFallback}`);
      }
    }

    if (!callRow) return null;
    const call = callRow;
    // Resolved call id — definitely non-null past this point.
    const resolvedCallId: string = call.id;

    const { data: vertical } = await sb
      .from('verticals')
      .select('config')
      .eq('id', call.vertical_id)
      .maybeSingle();

    const { data: lead } = await sb
      .from('leads')
      .select('name, title, company, email, trigger_event')
      .eq('id', call.lead_id)
      .maybeSingle();

    // Snapshot the playbook onto the call row for later outcome attribution
    const playbook = (vertical?.config as { playbook?: Record<string, unknown> })?.playbook || null;
    if (playbook) {
      await sb.from('calls').update({ playbook_snapshot: playbook }).eq('id', resolvedCallId);
    }

    return {
      callId: resolvedCallId,
      leadId: call.lead_id,
      verticalId: call.vertical_id,
      playbook,
      lead: lead ?? null,
    };
  };

  ws.on('message', async (raw) => {
    let msg: { event?: string; start?: { streamSid?: string; callSid?: string }; media?: { payload?: string } };
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }

    if (msg.event === 'connected') {
      return;
    }

    if (msg.event === 'start') {
      streamSid = msg.start?.streamSid ?? null;
      const startCallSid = msg.start?.callSid ?? null;
      console.log(`[twilio-stream] start event received: urlCallId=${callId} twilioCallSid=${startCallSid} streamSid=${streamSid}`);
      const ctx = await initContext(startCallSid);
      if (!ctx) {
        console.warn('[twilio-stream] no call_id context (URL had none AND CallSid lookup failed); coaching disabled');
        return;
      }

      // Open Speechmatics RT
      speechmatics = new SpeechmaticsRtSession({
        onPartial: (text, ts) => {
          // Replace the last partial in the buffer (avoid duplicating)
          if (transcript.length > 0 && !transcript[transcript.length - 1].final) {
            transcript[transcript.length - 1] = { ts, text, final: false };
          } else {
            transcript.push({ ts, text, final: false });
          }
        },
        onFinal: (text, ts) => {
          // Replace last partial with the final
          if (transcript.length > 0 && !transcript[transcript.length - 1].final) {
            transcript[transcript.length - 1] = { ts, text, final: true };
          } else {
            transcript.push({ ts, text, final: true });
          }
        },
        onError: (err) => console.warn('[speechmatics-rt] error:', err.message),
        onClose: () => console.log('[speechmatics-rt] closed'),
        onRecognitionStarted: async () => {
          // Surface a visible "we are listening" card the moment the
          // transcription pipeline is live. This is the diagnostic signal
          // operators can rely on — if the panel shows this card, audio
          // is flowing; if not, the upstream pipe is broken.
          try {
            await supabase().from('live_coaching_events').insert({
              call_id: ctx.callId,
              lead_id: ctx.leadId,
              vertical_id: ctx.verticalId,
              type: 'section_change',
              message: '🎙️ Coaching engaged — listening to the call',
              suggested_action: ctx.playbook
                ? 'Open with the trigger-event variant from your playbook.'
                : 'Open with your standard cold opener — no playbook for this vertical.',
            });
          } catch (err) {
            console.error('[twilio-stream] failed to insert engaged event:', err);
          }
        },
      });
      try {
        await speechmatics.open();
      } catch (err) {
        console.error('[twilio-stream] speechmatics open failed:', err);
        // Surface the failure to the panel so the operator knows live
        // coaching is degraded — without this, the panel just sits silent.
        try {
          await supabase().from('live_coaching_events').insert({
            call_id: ctx.callId,
            lead_id: ctx.leadId,
            vertical_id: ctx.verticalId,
            type: 'section_change',
            message: '⚠️ Live transcription unavailable — call still recording for post-call review',
            suggested_action: 'Run the playbook from memory; you’ll get the full scorecard after hangup.',
          });
        } catch {}
        speechmatics = null;
      }

      coach = new CoachLoop({
        ctx,
        getTranscript: getTranscriptWindow,
        intervalMs: 5_000,
      });
      coach.start();
      console.log(`[twilio-stream] live coaching started for call ${callId} (stream ${streamSid})`);
      return;
    }

    if (msg.event === 'media' && msg.media?.payload && speechmatics) {
      const chunk = Buffer.from(msg.media.payload, 'base64');
      speechmatics.sendAudio(chunk);
      return;
    }
    if (msg.event === 'media' && !speechmatics) {
      // Audio arriving but speechmatics is null (open failed). Log once.
      // Don't spam — these arrive at 50/sec.
      return;
    }

    if (msg.event === 'stop') {
      console.log(`[twilio-stream] stop received for stream ${streamSid}`);
      coach?.stop();
      await speechmatics?.close();
      try { ws.close(); } catch {}
      return;
    }
  });

  ws.on('close', () => {
    coach?.stop();
    void speechmatics?.close();
    console.log(`[twilio-stream] websocket closed (stream ${streamSid})`);
  });

  ws.on('error', (err) => {
    console.error('[twilio-stream] ws error:', err);
  });
}
