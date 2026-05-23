// GET /api/run-status/[id] — polled by the vertical-builder wizard.
// Forwards to worker /run-status/:id which returns
// { id, status, result_json, error_message, summary, finished_at }.

import { callWorker } from "@/app/lib/worker";

export const maxDuration = 10;
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(_req, { params }) {
  const { id } = params;
  if (!id) {
    return new Response(JSON.stringify({ error: "missing_id" }), {
      status: 400,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store, max-age=0" },
    });
  }
  const res = await callWorker(`/run-status/${encodeURIComponent(id)}`, {
    method: "GET",
    timeoutMs: 10_000,
  });
  const text = await res.text();
  return new Response(text, {
    status: res.status,
    headers: {
      "Content-Type": res.headers.get("Content-Type") || "application/json",
      "Cache-Control": "no-store, max-age=0, must-revalidate",
    },
  });
}
