// POST /api/call/initiate — kick off a Twilio bridge call for a lead.
// Body: { lead_id, operator_phone? }

import { proxyJSON } from "@/app/lib/worker";

export const maxDuration = 30;

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  return proxyJSON("/call/initiate", body, { timeoutMs: 25_000 });
}
