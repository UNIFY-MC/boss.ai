// POST /api/caller-id/verify — start Twilio's automated verification flow for an operator cell.
// Body: { phone (+E.164), display_name? }
// Response: { phone, validation_code, message }

import { proxyJSON } from "@/app/lib/worker";

export const maxDuration = 30;

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  return proxyJSON("/caller-id/verify", body, { timeoutMs: 20_000 });
}
