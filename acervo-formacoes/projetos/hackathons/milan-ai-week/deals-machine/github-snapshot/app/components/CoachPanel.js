"use client";
// CoachPanel — live, during-call coaching surface.
//
// Watches for any in-progress call on this lead. When one starts, subscribes
// to live_coaching_events for that call_id via Supabase Realtime and renders
// coaching cards as they fire. Closes automatically when the call ends.

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/app/lib/supabase";

const TYPE_LABEL = {
  objection_detected:   "Objection",
  suggestion:           "Suggestion",
  confirmation_gap:     "Confirm this",
  section_change:       "Section",
  ack:                  "Heard",
  closing_cue:          "Close now",
  commitment_heard:     "Commitment",
};

const TYPE_TONE = {
  objection_detected: "bg-amber-50/80 border-amber-500/30 text-amber-900",
  suggestion:         "bg-tertiary-container/40 border-tertiary/30 text-on-tertiary-container",
  confirmation_gap:   "bg-error-container/40 border-error/30 text-on-error-container",
  section_change:     "bg-surface-container-low border-outline/20 text-on-surface-variant",
  ack:                "bg-surface-container-lowest border-outline/15 text-on-surface-variant",
  closing_cue:        "bg-tertiary-container/60 border-tertiary/40 text-on-tertiary-container",
  commitment_heard:   "bg-blue-50 border-blue-300 text-blue-900",
};

const ACTIVE_STATES = ["initiated", "ringing", "in_progress", "in-progress", "queued"];

export default function CoachPanel({ lead }) {
  const [activeCall, setActiveCall] = useState(null);
  const [events, setEvents] = useState([]);
  const scrollRef = useRef(null);

  // Watch for any in-flight call on this lead
  useEffect(() => {
    if (!lead?.id || !supabase) return;
    let cancelled = false;

    // Initial sweep
    (async () => {
      const { data } = await supabase
        .from("calls")
        .select("id, status, lead_id, vertical_id, created_at")
        .eq("lead_id", lead.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      if (data && ACTIVE_STATES.includes(data.status)) setActiveCall(data);
    })();

    const channel = supabase
      .channel(`coach-calls:${lead.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "calls", filter: `lead_id=eq.${lead.id}` },
        (payload) => {
          const next = payload.new;
          if (next && ACTIVE_STATES.includes(next.status)) {
            setActiveCall(next);
          } else if (next && (next.status === "completed" || next.status === "failed" || next.status === "no-answer")) {
            // Hold the panel open for 4s after the call ends to let final
            // coaching cards render, then clear.
            setTimeout(() => setActiveCall(null), 4000);
          }
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      try { supabase.removeChannel(channel); } catch {}
    };
  }, [lead?.id]);

  // Subscribe to live_coaching_events for the active call
  useEffect(() => {
    setEvents([]);
    if (!activeCall?.id || !supabase) return;

    (async () => {
      const { data } = await supabase
        .from("live_coaching_events")
        .select("id, type, message, suggested_action, playbook_ref, created_at")
        .eq("call_id", activeCall.id)
        .order("created_at", { ascending: true });
      setEvents(data || []);
    })();

    const channel = supabase
      .channel(`coach-events:${activeCall.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "live_coaching_events", filter: `call_id=eq.${activeCall.id}` },
        (payload) => setEvents((prev) => [...prev, payload.new]),
      )
      .subscribe();

    return () => {
      try { supabase.removeChannel(channel); } catch {}
    };
  }, [activeCall?.id]);

  // Auto-scroll on new event
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events.length]);

  if (!activeCall) return null;

  return (
    <div className="rounded-2xl border border-tertiary/30 bg-surface-container-low editorial-shadow overflow-hidden animate-fade-up">
      {/* Header — pulsing live indicator */}
      <div className="px-5 py-3 border-b border-outline/10 bg-tertiary-container/30 flex items-center gap-3">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full rounded-full bg-tertiary opacity-75 animate-ping" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-tertiary" />
        </span>
        <div className="flex-1 min-w-0">
          <div className="eyebrow text-on-tertiary-container">Live · Coach</div>
          <div className="font-headline font-extrabold text-on-surface text-[14px] tracking-tight">
            Listening on this call
          </div>
        </div>
        <div className="font-label text-[11px] text-on-surface-variant tabular-nums">
          {events.length} {events.length === 1 ? "event" : "events"}
        </div>
      </div>

      {/* Events feed */}
      <div ref={scrollRef} className="max-h-[420px] overflow-y-auto p-4 space-y-2.5">
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-tertiary opacity-60 animate-ping" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-tertiary" />
            </span>
            <div className="font-label text-[12.5px] text-on-surface-variant leading-snug max-w-[28ch]">
              Listening. Coaching cards will land here as the call unfolds.
            </div>
          </div>
        ) : (
          events.map((ev) => <CoachCard key={ev.id} ev={ev} />)
        )}
      </div>
    </div>
  );
}

function CoachCard({ ev }) {
  const tone = TYPE_TONE[ev.type] || TYPE_TONE.ack;
  return (
    <div className={`rounded-xl border px-3.5 py-2.5 animate-fade-in ${tone}`}>
      <div className="flex items-baseline gap-2 mb-1">
        <span className="font-label text-[10.5px] uppercase tracking-wider font-bold">
          {TYPE_LABEL[ev.type] || ev.type}
        </span>
        <span className="font-label text-[10.5px] opacity-70 tabular-nums">
          {relTime(ev.created_at)}
        </span>
      </div>
      <div className="font-label text-[13.5px] leading-relaxed">
        {ev.message}
      </div>
      {ev.suggested_action && (
        <div className="font-label text-[12px] mt-1.5 opacity-90 italic">
          → {ev.suggested_action}
        </div>
      )}
    </div>
  );
}

function relTime(ts) {
  const sec = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (sec < 5) return "just now";
  if (sec < 60) return `${sec}s`;
  return `${Math.floor(sec / 60)}m`;
}
