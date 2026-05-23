"use client";
// StreamingReasoningPanel — the live agent activity surface.
//
// Design (per Kyle's brief, 2026-05-16):
//   - Cream surface, Inter typography, no monospace anywhere
//   - Status pill at the top is the soul of the card — always says what's
//     happening now in a complete sentence
//   - Tail of 3 most recent events as rich cards beneath the pill
//   - Sticky "Show all N events" affordance at the bottom of the card
//   - Expand inline (no modal, no drawer) → sectioned full history grouped
//     by recency: "Last 15 minutes", "Last hour", "Today", "Earlier"
//   - "Just happened" flash: when a new event arrives, the status pill
//     tints emerald for 4s with a one-line preview of the event
//
// Click any event row to expand its metadata inline (chain_event renders
// structured rationale; other types pretty-print their metadata JSON).

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  subscribeActivityForRun,
  subscribeActivityForVertical,
  subscribeRun,
} from "@/app/lib/realtime";
import { supabase } from "@/app/lib/supabase";

const TYPE_DOT = {
  agent_step:        "bg-tertiary",
  chain_event:       "bg-tertiary",
  security_flag:     "bg-amber-500",
  transcript_ingest: "bg-blue-500",
  hubspot_push:      "bg-indigo-500",
  chat_insight:      "bg-tertiary",
  cron_trigger:      "bg-on-surface-variant",
  vertical_built:    "bg-tertiary",
  error:             "bg-error",
  info:              "bg-on-surface-variant",
};

const TYPE_LABEL = {
  agent_step:        "Agent step",
  chain_event:       "Chain built",
  security_flag:     "Security shield",
  transcript_ingest: "Transcript ingested",
  hubspot_push:      "HubSpot push",
  chat_insight:      "Brain learned",
  cron_trigger:      "Scheduled run",
  vertical_built:    "Vertical built",
  error:             "Error",
  info:              "Update",
};

const FLASH_DURATION_MS = 4000;

function relativeTime(ts) {
  if (!ts) return "";
  const sec = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (sec < 5) return "just now";
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}

function bucketFor(ts) {
  if (!ts) return "earlier";
  const ms = Date.now() - new Date(ts).getTime();
  if (ms < 15 * 60 * 1000) return "last_15min";
  if (ms < 60 * 60 * 1000) return "last_hour";
  const eventDate = new Date(ts);
  const now = new Date();
  if (
    eventDate.getFullYear() === now.getFullYear() &&
    eventDate.getMonth() === now.getMonth() &&
    eventDate.getDate() === now.getDate()
  ) {
    return "today";
  }
  return "earlier";
}

const BUCKET_LABEL = {
  last_15min: "Last 15 minutes",
  last_hour:  "Last hour",
  today:      "Today",
  earlier:    "Earlier",
};

const BUCKET_ORDER = ["last_15min", "last_hour", "today", "earlier"];

export default function StreamingReasoningPanel({
  runId = null,
  verticalId = null,
  defaultOpen = false,
}) {
  const [rows, setRows] = useState([]);
  const [runStatus, setRunStatus] = useState(null);
  const [expanded, setExpanded] = useState(defaultOpen);
  const [openMetaIds, setOpenMetaIds] = useState(() => new Set());
  const [flash, setFlash] = useState(null); // { event, until }
  const seenIdsRef = useRef(new Set());
  const scrollRef = useRef(null);

  const toggleMeta = useCallback((id) => {
    setOpenMetaIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const onRow = useCallback((row) => {
    setRows((prev) => {
      if (prev.some((r) => r.id === row.id)) return prev;
      const next = [...prev, row]
        .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
        .slice(0, 200);
      return next;
    });
  }, []);

  // Backfill on mount + when run/vertical changes
  useEffect(() => {
    if (!supabase) return;
    setRows([]);
    seenIdsRef.current = new Set();
    void (async () => {
      let q = supabase
        .from("activity_log")
        .select("id, run_id, vertical_id, lead_id, type, message, metadata, created_at");
      if (runId) {
        q = q.eq("run_id", runId).order("created_at", { ascending: false }).limit(200);
      } else if (verticalId) {
        q = q.eq("vertical_id", verticalId).order("created_at", { ascending: false }).limit(200);
      } else {
        return;
      }
      const { data } = await q;
      if (!data) return;
      setRows(data);
      seenIdsRef.current = new Set(data.map((r) => r.id));
    })();
  }, [runId, verticalId]);

  // Realtime subscription
  useEffect(() => {
    if (runId) return subscribeActivityForRun(runId, onRow);
    if (verticalId) return subscribeActivityForVertical(verticalId, onRow);
    return undefined;
  }, [runId, verticalId, onRow]);

  // Detect new arrivals → trigger "just happened" flash
  useEffect(() => {
    if (rows.length === 0) return;
    const newest = rows[0];
    if (!seenIdsRef.current.has(newest.id)) {
      seenIdsRef.current.add(newest.id);
      setFlash({ event: newest, until: Date.now() + FLASH_DURATION_MS });
    }
  }, [rows]);

  // Clear flash after FLASH_DURATION_MS
  useEffect(() => {
    if (!flash) return;
    const ms = Math.max(0, flash.until - Date.now());
    const t = setTimeout(() => setFlash(null), ms);
    return () => clearTimeout(t);
  }, [flash]);

  // Tick every 30s so relative timestamps refresh
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  // Run status subscription (for the "Working" pill)
  useEffect(() => {
    if (!runId || !supabase) return;
    let cancelled = false;
    void (async () => {
      const { data } = await supabase
        .from("runs")
        .select("status")
        .eq("id", runId)
        .single();
      if (!cancelled && data) setRunStatus(data.status);
    })();
    const unsub = subscribeRun(runId, (newRow) => {
      if (!cancelled) setRunStatus(newRow.status);
    });
    return () => {
      cancelled = true;
      unsub();
    };
  }, [runId]);

  const isWorking = runStatus === "queued" || runStatus === "running";

  // Pick what the status pill says
  const pillState = useMemo(() => {
    if (flash) {
      return {
        kind: "flash",
        message: flash.event.message,
      };
    }
    if (isWorking) {
      const latestStep = rows.find((r) => r.type === "agent_step");
      return {
        kind: "working",
        message: latestStep ? latestStep.message : "Agent is reasoning through the pipeline…",
      };
    }
    const newest = rows[0];
    return {
      kind: "idle",
      message: newest
        ? `Agent · Idle · last activity ${relativeTime(newest.created_at)}`
        : "Agent · Idle · no activity yet",
    };
  }, [flash, isWorking, rows]);

  const tail = rows.slice(0, 3);

  // Group rows by bucket for the expanded view
  const bucketed = useMemo(() => {
    const out = { last_15min: [], last_hour: [], today: [], earlier: [] };
    for (const r of rows) {
      out[bucketFor(r.created_at)].push(r);
    }
    return out;
  }, [rows]);

  return (
    <div className="rounded-2xl border border-outline/15 bg-surface-container-low editorial-shadow overflow-hidden">
      {/* Status pill */}
      <div className="px-5 pt-5 pb-4">
        <StatusPill state={pillState} />
      </div>

      {/* Tail of 3 */}
      {tail.length > 0 ? (
        <div className="px-5 pb-2">
          <div className="space-y-1.5">
            {tail.map((r, idx) => (
              <EventCard
                key={r.id}
                row={r}
                emphasis={idx === 0}
                isOpen={openMetaIds.has(r.id)}
                onToggle={toggleMeta}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="px-5 pb-5 font-label text-[13px] text-on-surface-variant italic">
          {isWorking
            ? "Waiting for the agent to start…"
            : "Agent is idle. Hit Run agent to see it reason in real time."}
        </div>
      )}

      {/* Sticky expand/collapse footer */}
      {rows.length > tail.length && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="w-full px-5 py-3 border-t border-outline/10 bg-surface-container-low/60 hover:bg-surface-container/40 transition-colors flex items-center justify-center gap-2 font-label text-[13px] font-semibold text-on-surface-variant hover:text-on-surface sticky bottom-0 backdrop-blur-sm"
        >
          <span>
            {expanded
              ? "Hide history"
              : `Show all ${rows.length} event${rows.length === 1 ? "" : "s"}`}
          </span>
          <span
            className={`material-symbols-outlined text-[18px] transition-transform ${expanded ? "rotate-180" : ""}`}
          >
            expand_more
          </span>
        </button>
      )}

      {/* Expanded sectioned history */}
      {expanded && rows.length > 0 && (
        <div
          ref={scrollRef}
          className="border-t border-outline/10 max-h-[420px] overflow-y-auto"
        >
          {BUCKET_ORDER.map((bucket) => {
            const items = bucketed[bucket];
            if (items.length === 0) return null;
            return (
              <div key={bucket}>
                <div className="sticky top-0 z-10 bg-surface-container-low/95 backdrop-blur-sm border-b border-outline/10 px-5 py-2">
                  <div className="eyebrow text-on-surface-variant/80">
                    {BUCKET_LABEL[bucket]}{" "}
                    <span className="text-on-surface-variant/50 font-mono normal-case tracking-normal">
                      · {items.length}
                    </span>
                  </div>
                </div>
                <div className="px-5 py-2 space-y-1.5">
                  {items.map((r) => (
                    <EventCard
                      key={r.id}
                      row={r}
                      isOpen={openMetaIds.has(r.id)}
                      onToggle={toggleMeta}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ──────────────────────── Status pill ──────────────────────── */

function StatusPill({ state }) {
  if (state.kind === "flash") {
    return (
      <div className="rounded-xl bg-tertiary-container border border-tertiary/30 px-4 py-3 flex items-start gap-3 animate-fade-in">
        <span className="relative flex h-2.5 w-2.5 mt-1.5 shrink-0">
          <span className="absolute inline-flex h-full w-full rounded-full bg-tertiary opacity-75 animate-ping"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-tertiary"></span>
        </span>
        <div className="min-w-0 flex-1">
          <div className="eyebrow text-on-tertiary-container/80">Agent · Just now</div>
          <div className="font-label text-[14px] font-semibold text-on-tertiary-container leading-snug mt-0.5">
            {state.message}
          </div>
        </div>
      </div>
    );
  }
  if (state.kind === "working") {
    return (
      <div className="rounded-xl bg-surface-container border border-tertiary/40 px-4 py-3 flex items-start gap-3 relative overflow-hidden">
        <span className="relative flex h-2.5 w-2.5 mt-1.5 shrink-0">
          <span className="absolute inline-flex h-full w-full rounded-full bg-tertiary opacity-75 animate-ping"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-tertiary"></span>
        </span>
        <div className="min-w-0 flex-1">
          <div className="eyebrow text-tertiary">Agent · Working</div>
          <div className="font-label text-[14px] font-semibold text-on-surface leading-snug mt-0.5 truncate">
            {state.message}
          </div>
        </div>
        {/* Pulsing underline */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-tertiary/15 overflow-hidden">
          <div className="h-full bg-tertiary animate-pulse" style={{ width: "60%" }} />
        </div>
      </div>
    );
  }
  // Idle
  return (
    <div className="rounded-xl bg-surface-container-lowest border border-outline/10 px-4 py-3 flex items-center gap-3">
      <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-on-surface-variant/40" />
      <div className="font-label text-[13.5px] font-medium text-on-surface-variant leading-snug">
        {state.message}
      </div>
    </div>
  );
}

/* ──────────────────────── Event card ──────────────────────── */

function EventCard({ row, emphasis = false, isOpen, onToggle }) {
  const dot = TYPE_DOT[row.type] ?? TYPE_DOT.info;
  const typeLabel = TYPE_LABEL[row.type] ?? TYPE_LABEL.info;
  const hasMetadata =
    row.metadata &&
    typeof row.metadata === "object" &&
    Object.keys(row.metadata).length > 0;
  return (
    <div className="rounded-lg overflow-hidden">
      <div
        onClick={hasMetadata ? () => onToggle(row.id) : undefined}
        className={`flex gap-3 px-3 py-2.5 rounded-lg transition-colors ${
          hasMetadata ? "cursor-pointer hover:bg-surface-container/50" : ""
        } ${emphasis ? "bg-surface-container-lowest border border-outline/10" : ""}`}
      >
        <span
          className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${dot} ${emphasis ? "ring-2 ring-offset-1 ring-offset-surface-container-low ring-current/30" : ""}`}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span
              className={`font-label text-[11px] uppercase tracking-wider ${emphasis ? "text-on-surface font-bold" : "text-on-surface-variant font-semibold"}`}
            >
              {typeLabel}
            </span>
            <span className="font-label text-[11px] text-on-surface-variant/60 tabular-nums">
              {relativeTime(row.created_at)}
            </span>
          </div>
          <div
            className={`font-label leading-snug mt-0.5 break-words ${emphasis ? "text-[14px] text-on-surface" : "text-[13px] text-on-surface/85"}`}
          >
            {row.message}
          </div>
        </div>
        {hasMetadata && (
          <span
            className={`material-symbols-outlined text-[16px] text-on-surface-variant/60 shrink-0 self-center transition-transform ${
              isOpen ? "rotate-180" : ""
            }`}
          >
            expand_more
          </span>
        )}
      </div>
      {hasMetadata && isOpen && <RationaleDetail type={row.type} metadata={row.metadata} />}
    </div>
  );
}

/* ──────────────────────── Rationale (expanded metadata) ──────────────────────── */

function RationaleDetail({ type, metadata }) {
  if (type === "chain_event") {
    return (
      <div className="ml-6 mt-1 mb-1 mr-2 p-3 rounded-lg bg-surface-container-lowest border border-outline/10 space-y-2 animate-fade-in">
        {metadata.event && <Field label="Event" value={metadata.event} />}
        {metadata.target_profile && <Field label="Who buys now" value={metadata.target_profile} />}
        {metadata.urgency && <Field label="Why now" value={metadata.urgency} />}
        {metadata.angle && <Field label="Angle" value={metadata.angle} />}
        {metadata.source_url && (
          <Field
            label="Source"
            value={
              <a
                href={metadata.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-on-surface underline decoration-dotted underline-offset-2 hover:text-tertiary break-all"
              >
                {metadata.source_url}
              </a>
            }
          />
        )}
      </div>
    );
  }
  const json = JSON.stringify(metadata, null, 2);
  return (
    <pre className="ml-6 mt-1 mb-1 mr-2 p-3 rounded-lg bg-surface-container-lowest border border-outline/10 font-mono text-[11px] text-on-surface-variant whitespace-pre-wrap break-all animate-fade-in max-h-[260px] overflow-y-auto">
      {json.length > 2000 ? json.slice(0, 2000) + "\n…(truncated)" : json}
    </pre>
  );
}

function Field({ label, value }) {
  return (
    <div className="flex gap-2 items-baseline">
      <span className="eyebrow text-on-surface-variant/70 shrink-0 w-[88px]">{label}</span>
      <span className="font-label text-[13px] text-on-surface flex-1 break-words leading-snug">
        {value}
      </span>
    </div>
  );
}
