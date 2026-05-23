// POST /api/transcripts — forward to worker /ingest-transcript
// Body: { vertical_id, lead_id?, text?, audio_url?, source? }

import { proxyJSON } from "@/app/lib/worker";

export const maxDuration = 60;

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  return proxyJSON("/ingest-transcript", body, { timeoutMs: 120_000 });
}
