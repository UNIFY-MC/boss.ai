// GET /api/caller-id/verify/status?phone=+E.164 — poll verification status.
// Cockpit polls this every few seconds while the verification modal is open.

import { callWorker } from "@/app/lib/worker";

export const maxDuration = 30;

export async function GET(req) {
  const url = new URL(req.url);
  const phone = url.searchParams.get("phone");
  if (!phone) {
    return Response.json({ error: "phone_required" }, { status: 400 });
  }
  const upstream = await callWorker(
    `/caller-id/verify/status?phone=${encodeURIComponent(phone)}`,
    { method: "GET", timeoutMs: 15_000 }
  );
  const text = await upstream.text();
  return new Response(text, {
    status: upstream.status,
    headers: { "Content-Type": "application/json" },
  });
}
