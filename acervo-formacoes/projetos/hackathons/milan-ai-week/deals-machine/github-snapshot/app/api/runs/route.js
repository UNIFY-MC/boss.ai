// POST /api/runs — create a run, then trigger the worker pipeline.
// Cockpit subscribes to Supabase Realtime on activity_log filtered by run_id
// to render the streaming reasoning UI.

import { supabaseServer } from "@/app/lib/supabase-server";
import { callWorker } from "@/app/lib/worker";

export const maxDuration = 60;

export async function POST(req) {
  if (!supabaseServer) {
    return Response.json({ error: "supabase_not_configured" }, { status: 500 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const { vertical_id, triggered_by = "manual" } = body || {};
  if (!vertical_id) {
    return Response.json({ error: "vertical_id_required" }, { status: 400 });
  }

  // 1. Create run row (status=queued) — gives us the run_id to stream against
  const { data: run, error: runErr } = await supabaseServer
    .from("runs")
    .insert({ vertical_id, status: "queued", triggered_by })
    .select("id, vertical_id, status, triggered_by, created_at")
    .single();

  if (runErr || !run) {
    return Response.json({ error: "run_insert_failed", message: runErr?.message }, { status: 500 });
  }

  // 2. Fire the worker. We return 202 to the cockpit immediately; the worker
  //    flips status to running and streams reasoning to activity_log.
  const workerRes = await callWorker("/run", {
    method: "POST",
    body: JSON.stringify({ run_id: run.id, vertical_id, triggered_by }),
    timeoutMs: 15_000,
  });

  if (!workerRes.ok) {
    const errText = await workerRes.text();
    // Mark run failed so the cockpit doesn't sit forever
    await supabaseServer
      .from("runs")
      .update({ status: "failed", error_message: errText.slice(0, 500), finished_at: new Date().toISOString() })
      .eq("id", run.id);
    return Response.json({ error: "worker_reject", status: workerRes.status, body: errText }, { status: 502 });
  }

  return Response.json({ run_id: run.id, status: "accepted" }, { status: 202 });
}

// GET /api/runs?vertical_id=… — list recent runs for the dropdown / history strip
export async function GET(req) {
  const url = new URL(req.url);
  const vertical_id = url.searchParams.get("vertical_id");
  const limit = Number(url.searchParams.get("limit") ?? 20);

  if (!supabaseServer) {
    return Response.json({ error: "supabase_not_configured" }, { status: 500 });
  }
  let q = supabaseServer
    .from("runs")
    .select("id, vertical_id, status, started_at, finished_at, summary, triggered_by")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (vertical_id) q = q.eq("vertical_id", vertical_id);

  const { data, error } = await q;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ runs: data ?? [] });
}
