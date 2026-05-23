// POST /api/chat — proxy to worker /chat with SSE pass-through.

import { callWorker } from "@/app/lib/worker";

export const maxDuration = 120;

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const upstream = await callWorker("/chat", {
    method: "POST",
    body: JSON.stringify(body),
    timeoutMs: 110_000,
  });

  // Pass SSE stream through to client
  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      "Content-Type": upstream.headers.get("Content-Type") || "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
