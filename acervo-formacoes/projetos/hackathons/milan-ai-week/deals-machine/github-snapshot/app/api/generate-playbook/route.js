// POST /api/generate-playbook — composes the script playbook for a vertical
// from the brain entries it owns. Forwards to worker /generate-playbook.
// Body: { vertical_id }
// Response: { ok, playbook }

import { proxyJSON } from "@/app/lib/worker";

export const maxDuration = 60;

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  return proxyJSON("/generate-playbook", body, { timeoutMs: 60_000 });
}
