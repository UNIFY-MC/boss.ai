// POST /api/enrich-call — scores a completed call against its playbook and
// extracts what_worked / what_to_improve / confirmations / outcome_signal.
// Forwards to worker /enrich-call.

import { proxyJSON } from "@/app/lib/worker";

export const maxDuration = 60;

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  return proxyJSON("/enrich-call", body, { timeoutMs: 60_000 });
}
