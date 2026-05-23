// OpenAI Whisper audio transcription. Fallback when Speechmatics is not configured.

import { env } from '../lib/env';

const MIME: Record<string, string> = { mp3: 'audio/mpeg', wav: 'audio/wav', m4a: 'audio/mp4' };

async function postWhisper(blob: Blob, filename: string): Promise<string> {
  const form = new FormData();
  form.append('file', blob, filename);
  form.append('model', 'whisper-1');
  form.append('response_format', 'text');

  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}` },
    body: form,
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Whisper ${res.status}: ${txt.slice(0, 200)}`);
  }
  return await res.text();
}

export async function transcribeWithWhisper(audioUrl: string): Promise<string> {
  if (!env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not set');
  const audioRes = await fetch(audioUrl);
  if (!audioRes.ok) throw new Error(`audio fetch ${audioRes.status}`);
  const blob = await audioRes.blob();
  return postWhisper(blob, 'audio.mp3');
}

export async function transcribeBufferWithWhisper(buffer: Buffer, format: 'mp3' | 'wav' | 'm4a' = 'mp3'): Promise<string> {
  if (!env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not set');
  const mime = MIME[format] ?? 'audio/mpeg';
  const blob = new Blob([buffer], { type: mime });
  return postWhisper(blob, `audio.${format}`);
}
