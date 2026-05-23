"use client";
// Shared React data hooks for the agent-pipeline cockpit.
// All hooks default to live Supabase reads, fall back gracefully if Supabase
// isn't configured (so pages still render with empty state).

import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "./supabase";

/* ─── Verticals ──────────────────────────────────────────────────── */

export function useVerticals({ includeArchived = false } = {}) {
  const [verticals, setVerticals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    setLoading(true);
    let q = supabase
      .from("verticals")
      .select("id, slug, display_name, config, active, created_at")
      .order("created_at", { ascending: false });
    if (!includeArchived) q = q.eq("active", true);
    const { data, error } = await q;
    if (error) setError(error.message);
    else setVerticals(data || []);
    setLoading(false);
  }, [includeArchived]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { verticals, loading, error, refresh };
}

/* ─── Runs ───────────────────────────────────────────────────────── */

export function useRuns({ verticalId = null, limit = 50, status = null } = {}) {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    setLoading(true);
    let q = supabase
      .from("runs")
      .select("id, vertical_id, status, started_at, finished_at, summary, error_message, triggered_by, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (verticalId) q = q.eq("vertical_id", verticalId);
    if (status) q = q.eq("status", status);
    const { data } = await q;
    setRuns(data || []);
    setLoading(false);
  }, [verticalId, limit, status]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { runs, loading, refresh };
}

/* ─── Leads (agent pipeline) ─────────────────────────────────────── */

export function useAgentLeads({ verticalId = null, status = null, limit = 100 } = {}) {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    setLoading(true);
    let q = supabase
      .from("leads")
      .select(
        "id, vertical_id, run_id, name, title, company, location, phone, email, domain, status, pain_level, hubspot_id, pushed_at, memory_summary, created_at, updated_at"
      )
      .order("created_at", { ascending: false })
      .limit(limit);
    if (verticalId) q = q.eq("vertical_id", verticalId);
    if (status) q = q.eq("status", status);
    const { data } = await q;
    setLeads(data || []);
    setLoading(false);
  }, [verticalId, status, limit]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { leads, loading, refresh };
}

/* ─── Brain / Knowledge entries ──────────────────────────────────── */

export function useKnowledge({ verticalId = null, type = null, limit = 200 } = {}) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    setLoading(true);
    let q = supabase
      .from("brain_entries")
      .select("id, vertical_id, type, content, weight, source, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (verticalId) q = q.eq("vertical_id", verticalId);
    if (type) q = q.eq("type", type);
    const { data } = await q;
    setEntries(data || []);
    setLoading(false);
  }, [verticalId, type, limit]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { entries, loading, refresh };
}

/* ─── Calls ──────────────────────────────────────────────────────── */

export function useCalls({ verticalId = null, leadId = null, limit = 50 } = {}) {
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    setLoading(true);
    let q = supabase
      .from("calls")
      .select("id, vertical_id, lead_id, twilio_call_sid, status, recording_url, recording_duration_seconds, transcribed, transcript_id, created_at, ended_at")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (verticalId) q = q.eq("vertical_id", verticalId);
    if (leadId) q = q.eq("lead_id", leadId);
    const { data } = await q;
    setCalls(data || []);
    setLoading(false);
  }, [verticalId, leadId, limit]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { calls, loading, refresh };
}

/* ─── Aggregate dashboard stats ──────────────────────────────────── */

export function useDashboardStats() {
  const [stats, setStats] = useState({
    verticals: 0,
    runsToday: 0,
    leadsTotal: 0,
    callsTotal: 0,
    knowledgeEntries: 0,
    activeRuns: 0,
  });
  const [loading, setLoading] = useState(true);
  const firstLoadRef = useRef(true);

  const refresh = useCallback(async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    // Only toggle loading on the very first fetch; later polls update silently.
    const isFirstLoad = firstLoadRef.current;
    const todayIso = new Date(Date.now() - 24 * 3600 * 1000).toISOString();

    const [vertRes, runsTodayRes, leadsRes, callsRes, knowledgeRes, activeRunsRes] =
      await Promise.all([
        supabase.from("verticals").select("id", { count: "exact", head: true }).eq("active", true),
        supabase.from("runs").select("id", { count: "exact", head: true }).gte("created_at", todayIso),
        supabase.from("leads").select("id", { count: "exact", head: true }),
        supabase.from("calls").select("id", { count: "exact", head: true }),
        supabase.from("brain_entries").select("id", { count: "exact", head: true }),
        supabase.from("runs").select("id", { count: "exact", head: true }).eq("status", "running"),
      ]);

    setStats({
      verticals: vertRes.count || 0,
      runsToday: runsTodayRes.count || 0,
      leadsTotal: leadsRes.count || 0,
      callsTotal: callsRes.count || 0,
      knowledgeEntries: knowledgeRes.count || 0,
      activeRuns: activeRunsRes.count || 0,
    });
    if (isFirstLoad) {
      firstLoadRef.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    // Live-refresh every 30s, silently. No skeleton flash, just number updates.
    const id = setInterval(refresh, 30_000);
    return () => clearInterval(id);
  }, [refresh]);

  return { stats, loading, refresh };
}

/* ─── Active runs (for Dashboard live widget) ────────────────────── */

export function useActiveRuns() {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const firstLoadRef = useRef(true);

  const refresh = useCallback(async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("runs")
      .select("id, vertical_id, status, started_at, summary, triggered_by")
      .eq("status", "running")
      .order("started_at", { ascending: false });
    setRuns((prev) => {
      const next = data || [];
      // Avoid unnecessary re-render when the list is unchanged.
      if (
        prev.length === next.length &&
        prev.every((r, i) => r.id === next[i].id && r.status === next[i].status)
      ) {
        return prev;
      }
      return next;
    });
    if (firstLoadRef.current) {
      firstLoadRef.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 15_000);
    return () => clearInterval(id);
  }, [refresh]);

  return { runs, loading, refresh };
}
