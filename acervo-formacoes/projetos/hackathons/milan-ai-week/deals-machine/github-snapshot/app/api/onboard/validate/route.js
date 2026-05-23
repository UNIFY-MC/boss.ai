// POST /api/onboard/validate — web-search 8 real companies matching the ICP.
// Body: { cookie_token }
// Returns: { ok, companies: [{ company, domain?, why_fits }] }

import { proxyJSON } from "@/app/lib/worker";

// Web search via Anthropic can be slow. Give it room.
export const maxDuration = 120;

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  return proxyJSON("/onboard/validate", body, { timeoutMs: 110_000 });
}
