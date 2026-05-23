// POST /api/save-vertical — save an already-generated vertical without
// re-running the multi-step reasoning. Body: { generated: GeneratedVertical }.

import { proxyJSON } from "@/app/lib/worker";

export const maxDuration = 30;

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  return proxyJSON("/save-vertical", body, { timeoutMs: 30_000 });
}
