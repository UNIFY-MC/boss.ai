// Speechmatics Real-Time API client (subset).
//
// Auth: temporary JWT obtained from mp.speechmatics.com/v1/api_keys
// Audio: mulaw 8kHz mono (matches Twilio Media Streams) — must be wrapped
//        in a 16k PCM stream OR streamed as-is depending on config.
//        Per Speechmatics docs, mulaw is supported via audio_format.encoding=mulaw.

import WebSocket from 'ws';
import { env } from '../lib/env';

const SPEECHMATICS_AUTH_URL = 'https://mp.speechmatics.com/v1/api_keys?type=rt';
const SPEECHMATICS_RT_URL = 'wss://eu2.rt.speechmatics.com/v2';

interface MintTokenResponse {
  key_value: string;
}

let cachedToken: { jwt: string; expiresAt: number } | null = null;

export async function mintSpeechmaticsRtToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.jwt;
  }
  const apiKey = (env as { SPEECHMATICS_API_KEY?: string }).SPEECHMATICS_API_KEY;
  if (!apiKey) throw new Error('SPEECHMATICS_API_KEY not configured');

  const res = await fetch(SPEECHMATICS_AUTH_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ttl: 3600 }),
  });
  if (!res.ok) {
    throw new Error(`Speechmatics token mint failed: ${res.status} ${await res.text()}`);
  }
  const json = (await res.json()) as MintTokenResponse;
  cachedToken = { jwt: json.key_value, expiresAt: Date.now() + 3500_000 };
  return json.key_value;
}

export interface SpeechmaticsRtCallbacks {
  onPartial?: (text: string, ts: number) => void;
  onFinal?: (text: string, ts: number) => void;
  onError?: (err: Error) => void;
  onClose?: () => void;
  /** Fires once Speechmatics ack's StartRecognition. Audio is fully flowing
   *  from this moment on. */
  onRecognitionStarted?: () => void;
}

export class SpeechmaticsRtSession {
  private ws: WebSocket | null = null;
  private seq = 0;
  private opened = false;       // ws-level: TCP/TLS handshake complete
  private recognizing = false;  // Speechmatics-level: StartRecognition ack'd
  private endStreamSent = false;
  private droppedFrames = 0;

  constructor(private callbacks: SpeechmaticsRtCallbacks) {}

  /** Resolves once the WebSocket is open AND Speechmatics has acked the
   *  StartRecognition handshake. Audio sent before this resolves was
   *  silently dropped — which on a short call means no transcripts. */
  open(): Promise<void> {
    return new Promise(async (resolve, reject) => {
      let jwt: string;
      try {
        jwt = await mintSpeechmaticsRtToken();
      } catch (err) {
        return reject(err);
      }
      console.log('[speechmatics-rt] minted token, opening WS to', SPEECHMATICS_RT_URL);
      this.ws = new WebSocket(`${SPEECHMATICS_RT_URL}/en?jwt=${jwt}`);

      const timeout = setTimeout(() => {
        if (!this.recognizing) {
          reject(new Error('Speechmatics RecognitionStarted timeout (10s)'));
        }
      }, 10_000);

      this.ws.on('open', () => {
        console.log('[speechmatics-rt] WS open, sending StartRecognition');
        this.opened = true;
        this.ws!.send(JSON.stringify({
          message: 'StartRecognition',
          audio_format: {
            type: 'raw',
            encoding: 'mulaw',
            sample_rate: 8000,
          },
          transcription_config: {
            language: 'en',
            enable_partials: true,
            max_delay: 2,
            operating_point: 'enhanced',
          },
        }));
      });

      this.ws.on('message', (raw) => {
        try {
          const msg = JSON.parse(raw.toString());
          if (msg.message === 'RecognitionStarted') {
            console.log('[speechmatics-rt] RecognitionStarted — ready for audio');
            this.recognizing = true;
            clearTimeout(timeout);
            this.callbacks.onRecognitionStarted?.();
            resolve();
            return;
          }
          if (msg.message === 'AddPartialTranscript') {
            const text = msg.metadata?.transcript || '';
            if (text) this.callbacks.onPartial?.(text, Date.now());
          } else if (msg.message === 'AddTranscript') {
            const text = msg.metadata?.transcript || '';
            if (text) {
              console.log(`[speechmatics-rt] AddTranscript: "${text.slice(0, 80)}"`);
              this.callbacks.onFinal?.(text, Date.now());
            }
          } else if (msg.message === 'Error') {
            const err = new Error(msg.reason || 'Speechmatics error');
            console.error('[speechmatics-rt] Error message:', msg);
            clearTimeout(timeout);
            this.callbacks.onError?.(err);
            if (!this.recognizing) reject(err);
          }
        } catch {
          // Ignore malformed
        }
      });

      this.ws.on('error', (err) => {
        console.error('[speechmatics-rt] WS error:', (err as Error).message);
        clearTimeout(timeout);
        this.callbacks.onError?.(err as Error);
        if (!this.recognizing) reject(err);
      });
      this.ws.on('close', (code, reason) => {
        console.log(`[speechmatics-rt] WS closed (code=${code}${reason ? `, reason=${reason.toString()}` : ''})`);
        this.opened = false;
        this.recognizing = false;
        this.callbacks.onClose?.();
      });
    });
  }

  /** Send a mulaw audio chunk (raw bytes, not base64). */
  sendAudio(chunk: Buffer): void {
    if (!this.ws || !this.recognizing || this.endStreamSent) {
      this.droppedFrames++;
      if (this.droppedFrames % 50 === 1) {
        console.log(`[speechmatics-rt] dropping audio (ws=${!!this.ws} recognizing=${this.recognizing} ended=${this.endStreamSent}) — ${this.droppedFrames} dropped so far`);
      }
      return;
    }
    this.seq++;
    this.ws.send(chunk);
    if (this.seq === 1 || this.seq === 50 || this.seq === 200) {
      console.log(`[speechmatics-rt] forwarded audio frame #${this.seq} (${chunk.length} bytes)`);
    }
  }

  async close(): Promise<void> {
    if (!this.ws) return;
    if (this.opened && !this.endStreamSent) {
      try {
        this.ws.send(JSON.stringify({
          message: 'EndOfStream',
          last_seq_no: this.seq,
        }));
        this.endStreamSent = true;
      } catch {}
    }
    try { this.ws.close(); } catch {}
    this.ws = null;
  }
}
