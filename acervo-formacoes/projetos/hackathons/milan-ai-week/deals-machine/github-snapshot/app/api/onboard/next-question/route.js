// POST /api/onboard/next-question — record an answer, return next question.
// Body: { cookie_token, answer? }
// Returns: { ok, step, max_step, next_question, scratchpad, niches_detected, done }

import { proxyJSON } from "@/app/lib/worker";

export const maxDuration = 60;

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  return proxyJSON("/onboard/next-question", body, { timeoutMs: 60_000 });
}
