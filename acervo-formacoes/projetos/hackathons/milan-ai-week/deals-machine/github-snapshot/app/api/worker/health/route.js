// GET /api/worker/health — server-side proxy that pings the Vultr worker's
// public /health endpoint. Surfaces real uptime + supabase reachability on
// the cockpit so the Vultr sponsor card isn't a hardcoded badge.

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const base = (process.env.WORKER_URL || "").replace(/\/$/, "");
  if (!base) {
    return Response.json(
      { ok: false, reachable: false, error: "WORKER_URL not configured" },
      { status: 200 },
    );
  }

  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 4000);
  const startedAt = Date.now();
  try {
    const res = await fetch(`${base}/health`, {
      signal: ctl.signal,
      cache: "no-store",
    });
    const latencyMs = Date.now() - startedAt;
    if (!res.ok) {
      return Response.json({
        ok: false,
        reachable: true,
        status: res.status,
        latency_ms: latencyMs,
      });
    }
    const body = await res.json();
    return Response.json({
      ok: true,
      reachable: true,
      latency_ms: latencyMs,
      ...body,
    });
  } catch (err) {
    return Response.json({
      ok: false,
      reachable: false,
      error: err?.name === "AbortError" ? "timeout" : String(err?.message || err),
    });
  } finally {
    clearTimeout(timer);
  }
}
