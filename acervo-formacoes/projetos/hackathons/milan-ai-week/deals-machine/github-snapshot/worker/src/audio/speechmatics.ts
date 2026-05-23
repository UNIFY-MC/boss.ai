// Speechmatics REST transcription. Async job model:
//   1. POST /jobs/ with multipart {data_file, config} — returns job_id
//   2. Poll GET /jobs/{id} until status=done (or failed/expired)
//   3. GET /jobs/{id}/transcript?format=txt
//
// API docs: https://docs.speechmatics.com/

import { env } from '../lib/env';

const BASE = 'https://asr.api.speechmatics.com/v2';

async function speechmaticsJobConfig(): Promise<string> {
  // Batch (async) job config — `enable_partials` is real-time only and
  // gets rejected here.
  return JSON.stringify({
    type: 'transcription',
    transcription_config: {
      language: 'en',
      operating_point: 'enhanced',
      diarization: 'speaker',
    },
  });
}

const MIME: Record<string, string> = { mp3: 'audio/mpeg', wav: 'audio/wav', m4a: 'audio/mp4' };

async function submitJobAndAwait(blob: Blob, filename: string): Promise<string> {
  const form = new FormData();
  form.append('data_file', blob, filename);
  form.append('config', await speechmaticsJobConfig());

  const submit = await fetch(`${BASE}/jobs/`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.SPEECHMATICS_API_KEY}` },
    body: form,
  });
  if (!submit.ok) throw new Error(`Speechmatics submit ${submit.status}: ${(await submit.text()).slice(0, 200)}`);
  const submitData = (await submit.json()) as { id?: string };
  const jobId = submitData.id;
  if (!jobId) throw new Error('no job id from Speechmatics');

  // Poll until done (max ~5 min)
  for (let i = 0; i < 60; i += 1) {
    await new Promise((r) => setTimeout(r, 5000));
    const statusRes = await fetch(`${BASE}/jobs/${jobId}`, {
      headers: { Authorization: `Bearer ${env.SPEECHMATICS_API_KEY}` },
    });
    if (!statusRes.ok) continue;
    const status = (await statusRes.json()) as { job?: { status?: string } };
    const s = status.job?.status;
    if (s === 'done') break;
    if (s === 'rejected' || s === 'expired') throw new Error(`Speechmatics job ${s}`);
  }

  const tx = await fetch(`${BASE}/jobs/${jobId}/transcript?format=txt`, {
    headers: { Authorization: `Bearer ${env.SPEECHMATICS_API_KEY}` },
  });
  if (!tx.ok) throw new Error(`Speechmatics transcript ${tx.status}`);
  return await tx.text();
}

export async function transcribeWithSpeechmatics(audioUrl: string): Promise<string> {
  if (!env.SPEECHMATICS_API_KEY) throw new Error('SPEECHMATICS_API_KEY not set');
  const audioRes = await fetch(audioUrl);
  if (!audioRes.ok) throw new Error(`audio fetch ${audioRes.status}`);
  const audioBlob = await audioRes.blob();
  return submitJobAndAwait(audioBlob, 'audio.mp3');
}

export async function transcribeBufferWithSpeechmatics(
  buffer: Buffer,
  format: 'mp3' | 'wav' | 'm4a' = 'mp3'
): Promise<string> {
  if (!env.SPEECHMATICS_API_KEY) throw new Error('SPEECHMATICS_API_KEY not set');
  const mime = MIME[format] ?? 'audio/mpeg';
  const blob = new Blob([buffer], { type: mime });
  return submitJobAndAwait(blob, `audio.${format}`);
}
