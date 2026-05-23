// Supabase Realtime subscription helpers for the cockpit.
//
// The streaming reasoning UI subscribes to activity_log filtered by run_id
// and renders each row as a live "thought" line.

"use client";

import { supabase } from "./supabase";

/**
 * Subscribe to activity_log inserts for a specific run.
 * @param {string} runId
 * @param {(row: object) => void} onRow
 * @returns {() => void} unsubscribe
 */
export function subscribeActivityForRun(runId, onRow) {
  if (!supabase || !runId) return () => {};
  const channel = supabase
    .channel(`activity:${runId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "activity_log", filter: `run_id=eq.${runId}` },
      (payload) => onRow(payload.new),
    )
    .subscribe();

  return () => {
    try {
      supabase.removeChannel(channel);
    } catch (_) {}
  };
}

/**
 * Subscribe to ALL activity for a vertical (used when no specific run is
 * active — e.g., to surface vertical-builder reasoning, cron-triggered runs).
 */
export function subscribeActivityForVertical(verticalId, onRow, limit = 30) {
  if (!supabase || !verticalId) return () => {};

  // Initial backfill — most recent N rows so the panel doesn't start empty
  void (async () => {
    const { data } = await supabase
      .from("activity_log")
      .select("id, run_id, vertical_id, lead_id, type, message, metadata, created_at")
      .eq("vertical_id", verticalId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (data) {
      // Replay oldest first so the panel reads naturally
      [...data].reverse().forEach(onRow);
    }
  })();

  const channel = supabase
    .channel(`activity:vertical:${verticalId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "activity_log", filter: `vertical_id=eq.${verticalId}` },
      (payload) => onRow(payload.new),
    )
    .subscribe();

  return () => {
    try {
      supabase.removeChannel(channel);
    } catch (_) {}
  };
}

export function subscribeRun(runId, onUpdate) {
  if (!supabase || !runId) return () => {};
  const channel = supabase
    .channel(`run:${runId}`)
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "runs", filter: `id=eq.${runId}` },
      (payload) => onUpdate(payload.new),
    )
    .subscribe();
  return () => {
    try {
      supabase.removeChannel(channel);
    } catch (_) {}
  };
}

export function subscribeBrain(verticalId, onRow) {
  if (!supabase || !verticalId) return () => {};
  const channel = supabase
    .channel(`brain:${verticalId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "brain_entries", filter: `vertical_id=eq.${verticalId}` },
      (payload) => onRow(payload.new),
    )
    .subscribe();
  return () => {
    try {
      supabase.removeChannel(channel);
    } catch (_) {}
  };
}

export function subscribeLeads(verticalId, onChange) {
  if (!supabase || !verticalId) return () => {};
  const channel = supabase
    .channel(`leads:${verticalId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "leads", filter: `vertical_id=eq.${verticalId}` },
      (payload) => onChange(payload),
    )
    .subscribe();
  return () => {
    try {
      supabase.removeChannel(channel);
    } catch (_) {}
  };
}

// IMPORTANT: every channel name must be globally unique within the page.
// Two subscribers using the same channel name share one channel — when
// either one calls removeChannel on cleanup, the OTHER subscriber goes
// silent. The `subscriber` argument below is appended to the channel name
// so callers can disambiguate themselves.
//
// Each ephemeral subscription also gets a per-mount random suffix so a
// fast-running effect (e.g. one whose deps include `draft?.id`) doesn't
// race itself between teardown and re-mount.

function uniq() {
  return Math.random().toString(36).slice(2, 8);
}

/**
 * Subscribe to all activity_log inserts for a specific lead.
 * Used by the post-call panel to stream "Transcribing… → Brain learning →
 * Drafting follow-up…" in real time on the selected lead's detail card.
 */
export function subscribeActivityForLead(leadId, onRow, subscriber = "default") {
  if (!supabase || !leadId) return () => {};
  const channel = supabase
    .channel(`activity:lead:${leadId}:${subscriber}:${uniq()}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "activity_log", filter: `lead_id=eq.${leadId}` },
      (payload) => onRow(payload.new),
    )
    .subscribe();
  return () => {
    try {
      supabase.removeChannel(channel);
    } catch (_) {}
  };
}

/**
 * Subscribe to email_drafts changes for a specific lead. Drafts auto-write
 * post-call via the worker's brain/ingest path. Watches both INSERT (new
 * draft landed) and UPDATE (older draft got superseded → status='discarded').
 */
export function subscribeDraftsForLead(leadId, onChange, subscriber = "default") {
  if (!supabase || !leadId) return () => {};
  const channel = supabase
    .channel(`drafts:lead:${leadId}:${subscriber}:${uniq()}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "email_drafts", filter: `lead_id=eq.${leadId}` },
      (payload) => onChange(payload),
    )
    .subscribe();
  return () => {
    try {
      supabase.removeChannel(channel);
    } catch (_) {}
  };
}

/**
 * Subscribe to calls row updates for a specific lead — surfaces lifecycle
 * (recording-ready / transcribed / enrichment landed) inline on the lead
 * detail without a page refresh.
 */
export function subscribeCallsForLead(leadId, onChange, subscriber = "default") {
  if (!supabase || !leadId) return () => {};
  const channel = supabase
    .channel(`calls:lead:${leadId}:${subscriber}:${uniq()}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "calls", filter: `lead_id=eq.${leadId}` },
      (payload) => onChange(payload),
    )
    .subscribe();
  return () => {
    try {
      supabase.removeChannel(channel);
    } catch (_) {}
  };
}
