// POST /api/onboard/start — start or resume an onboarding session.
// Body: { cookie_token }
// Returns: { ok, session, resumed }

import { proxyJSON } from "@/app/lib/worker";

export const maxDuration = 30;

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  return proxyJSON("/onboard/start", body, { timeoutMs: 30_000 });
}
