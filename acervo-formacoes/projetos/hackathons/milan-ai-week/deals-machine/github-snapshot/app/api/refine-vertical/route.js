// POST /api/refine-vertical — iterative refinement of a vertical config.
// Forwards to worker /refine-vertical.
// Body: { previous_config, refinement_message, run_id? }
// Returns either { kind: 'updated', generated, changes_summary, changed_fields }
// or { kind: 'clarification', clarification_question }.

import { proxyJSON } from "@/app/lib/worker";

export const maxDuration = 60;

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  return proxyJSON("/refine-vertical", body, { timeoutMs: 60_000 });
}
