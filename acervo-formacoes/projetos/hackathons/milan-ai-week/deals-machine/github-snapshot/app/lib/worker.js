// Thin fetch wrapper for calling the Vultr-hosted worker.
// Adds the shared-secret header and a sensible timeout.

const WORKER_URL = process.env.WORKER_URL || "http://localhost:3000";
const SECRET = process.env.WORKER_PROXY_SECRET || "";

export async function callWorker(path, init = {}) {
  if (!SECRET) {
    return new Response(
      JSON.stringify({ error: "worker_secret_missing", message: "WORKER_PROXY_SECRET not set in env" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  const url = `${WORKER_URL.replace(/\/$/, "")}${path}`;
  const headers = new Headers(init.headers || {});
  headers.set("x-worker-secret", SECRET);
  if (!headers.has("Content-Type") && init.body) headers.set("Content-Type", "application/json");

  // Allow the caller to control timeout. Default 60s (Run is fire-and-forget anyway).
  const timeoutMs = init.timeoutMs || 60_000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...init, headers, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Helper for JSON-in / JSON-out proxy calls. Forwards status code, body, and
 * Content-Type header. Tolerant of non-JSON responses.
 */
export async function proxyJSON(path, body, opts = {}) {
  const res = await callWorker(path, {
    method: opts.method || "POST",
    body: body ? JSON.stringify(body) : undefined,
    timeoutMs: opts.timeoutMs,
  });

  const contentType = res.headers.get("Content-Type") || "application/json";
  const text = await res.text();
  return new Response(text, {
    status: res.status,
    headers: { "Content-Type": contentType },
  });
}
