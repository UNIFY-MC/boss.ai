// POST /api/hubspot/push — forward to worker /hubspot/push
// Body: { lead_ids: [uuid, ...] }

import { proxyJSON } from "@/app/lib/worker";

export const maxDuration = 60;

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  return proxyJSON("/hubspot/push", body, { timeoutMs: 60_000 });
}
