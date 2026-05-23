// POST /api/apply-outcome — closes the loop: a call outcome bumps the
// weight of brain entries that fed the playbook, then triggers auto-regen.
// Forwards to worker /apply-outcome.

import { proxyJSON } from "@/app/lib/worker";

export const maxDuration = 30;

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  return proxyJSON("/apply-outcome", body, { timeoutMs: 30_000 });
}
