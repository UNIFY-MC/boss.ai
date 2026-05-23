// POST /api/onboard/commit — turn the scratchpad into 1..N verticals.
// Body: { cookie_token, variations: [{ display_name, niche_override?, industry_override? }] }
// Returns: { ok, vertical_ids }

import { proxyJSON } from "@/app/lib/worker";

export const maxDuration = 60;

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  return proxyJSON("/onboard/commit", body, { timeoutMs: 60_000 });
}
