// POST /api/generate-vertical — generates a vertical config (ICP, sources,
// persona, voice) from a one-paragraph description. Forwards to the worker.
// Body: { description, run_id?, save? }
// If save=true, the worker persists the vertical and returns the saved row.

import { proxyJSON } from "@/app/lib/worker";

export const maxDuration = 60;

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  return proxyJSON("/generate-vertical", body, { timeoutMs: 60_000 });
}
