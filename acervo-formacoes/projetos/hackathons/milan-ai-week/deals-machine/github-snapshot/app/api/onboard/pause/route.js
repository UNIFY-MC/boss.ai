// POST /api/onboard/pause — mark the session paused so user can resume later.
// Body: { cookie_token }
// Returns: { ok }

import { proxyJSON } from "@/app/lib/worker";

export const maxDuration = 15;

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  return proxyJSON("/onboard/pause", body, { timeoutMs: 15_000 });
}
