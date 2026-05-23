"use client";
// CallButton — the operator's "make the call" trigger.
//
// Operator clicks → cockpit POSTs /api/call/initiate → worker calls
// Twilio → operator's cell rings. Status updates live via Supabase
// Realtime subscription on the `calls` row.

import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabase";

const STATUS_META = {
  initiated:   { label: "Initiating…",                       tone: "pending" },
  ringing:     { label: "Your cell is ringing — answer it",  tone: "pending" },
  in_progress: { label: "On the call — recording",           tone: "live" },
  completed:   { label: "Call ended — transcribing",         tone: "success" },
  no_answer:   { label: "No answer",                         tone: "error" },
  busy:        { label: "Lead was busy",                     tone: "error" },
  failed:      { label: "Call failed",                       tone: "error" },
  canceled:    { label: "Canceled",                          tone: "muted" },
};

const TONE_CLASSES = {
  pending: "bg-amber-500/15 text-amber-800 border-amber-500/30",
  live:    "bg-tertiary-container text-on-tertiary-container border-tertiary/30",
  success: "bg-tertiary-container text-on-tertiary-container border-tertiary/30",
  error:   "bg-error-container text-on-error-container border-error/30",
  muted:   "bg-surface-container-high text-on-surface-variant border-outline/15",
};

const FINAL_STATES = ["no_answer", "busy", "failed", "canceled"];

// localStorage key used by both CallButton and /intelligence to auto-focus
// the vertical of the operator's most recent call.
const LAST_CALL_VERTICAL_LS = "deals-machine.last_call_vertical";

function relativeTime(ts) {
  if (!ts) return "";
  const sec = Math.floor((Date.now() - ts) / 1000);
  if (sec < 5) return "just now";
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  return `${hr}h ago`;
}

export default function CallButton({ lead, onNeedsVerification }) {
  const [callId, setCallId] = useState(null);
  const [callStatus, setCallStatus] = useState(null);
  const [error, setError] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [completedAt, setCompletedAt] = useState(null);

  useEffect(() => {
    if (!callId || !supabase) return;
    const channel = supabase
      .channel(`call:${callId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "calls", filter: `id=eq.${callId}` },
        (payload) => setCallStatus(payload.new.status)
      )
      .subscribe();
    return () => {
      try {
        supabase.removeChannel(channel);
      } catch (_) {}
    };
  }, [callId]);

  useEffect(() => {
    if (!callStatus) return;
    const isDone = callStatus === "completed" || FINAL_STATES.includes(callStatus);
    if (!isDone) return;
    // On successful completion, remember when it happened — the button shows
    // a muted "Called <First>" pill instead of resetting to the dial state.
    if (callStatus === "completed") {
      setCompletedAt(Date.now());
    }
    const t = setTimeout(
      () => {
        setCallId(null);
        setCallStatus(null);
      },
      callStatus === "completed" ? 4000 : 6000
    );
    return () => clearTimeout(t);
  }, [callStatus]);

  const handleClick = async () => {
    if (!lead?.id) return;

    // Two-stage confirm. First click arms the button (5s window); second
    // click actually dials. This is the demo-safety gate that prevents a
    // judge from accidentally placing a real Twilio call with one click.
    if (!confirming) {
      setError(null);
      setConfirming(true);
      return;
    }
    setConfirming(false);
    setError(null);
    setCompletedAt(null);
    setCallStatus("initiated");

    // Persist the vertical this call was placed against so /intelligence
    // can auto-focus it when the operator switches tabs to watch the
    // streaming reasoning panel light up.
    if (typeof window !== "undefined" && lead?.vertical_id) {
      try {
        window.localStorage.setItem(
          LAST_CALL_VERTICAL_LS,
          JSON.stringify({ vertical_id: lead.vertical_id, ts: Date.now() })
        );
      } catch (_) {}
    }

    try {
      const res = await fetch("/api/call/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead_id: lead.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 412 && data?.error === "no_verified_caller_id") {
          setCallStatus(null);
          onNeedsVerification?.();
          return;
        }
        throw new Error(data?.message ?? data?.error ?? `HTTP ${res.status}`);
      }
      setCallId(data.call_id);
    } catch (err) {
      setError(err.message);
      setCallStatus(null);
    }
  };

  // Auto-reset the confirm state after 5s if the user walks away.
  useEffect(() => {
    if (!confirming) return;
    const t = setTimeout(() => setConfirming(false), 5000);
    return () => clearTimeout(t);
  }, [confirming]);

  const isActive =
    Boolean(callStatus) &&
    !FINAL_STATES.includes(callStatus) &&
    callStatus !== "completed";
  const disabled = isActive || !lead?.phone;
  const meta = callStatus ? STATUS_META[callStatus] : null;
  // After the success pill fades, the button enters a terminal "Called"
  // state that stays until the operator clicks "Call again" or refreshes.
  const isCalled = !isActive && !confirming && !callStatus && completedAt != null;
  const firstName = lead?.name?.split(/\s+/)[0] || "lead";

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <button
        onClick={handleClick}
        disabled={disabled}
        title={!lead?.phone ? "Lead has no phone number" : ""}
        className={`relative inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl font-headline font-bold text-sm shadow-lg transition-all ${
          disabled
            ? "bg-surface-container-high text-on-surface-variant/60 cursor-not-allowed shadow-none"
            : isActive
              ? "accent-live text-white"
              : confirming
                ? "bg-error text-on-error hover:-translate-y-px hover:shadow-xl ring-2 ring-error/30 ring-offset-2 ring-offset-surface animate-pulse"
                : isCalled
                  ? "bg-tertiary-container text-on-tertiary-container hover:bg-tertiary-container/80 shadow-none"
                  : "metallic-silk gleam-hover text-on-primary hover:-translate-y-px hover:shadow-xl"
        }`}
      >
        {isActive ? (
          <>
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-white opacity-75 animate-ping"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
            </span>
            On call
          </>
        ) : confirming ? (
          <>
            <span className="material-symbols-outlined text-[18px]">phone_forwarded</span>
            Tap again to dial {firstName}
          </>
        ) : isCalled ? (
          <>
            <span
              className="material-symbols-outlined text-[18px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              check_circle
            </span>
            Called {firstName} · {relativeTime(completedAt)}
          </>
        ) : (
          <>
            <span className="material-symbols-outlined text-[18px]">call</span>
            Call {firstName}
          </>
        )}
      </button>
      {isCalled && (
        <button
          onClick={() => {
            setCompletedAt(null);
            setConfirming(true);
          }}
          className="font-label text-[12px] text-on-surface-variant underline underline-offset-2 hover:text-on-surface"
        >
          Call again
        </button>
      )}
      {confirming && (
        <button
          onClick={() => setConfirming(false)}
          className="font-label text-[12px] text-on-surface-variant underline underline-offset-2 hover:text-on-surface"
        >
          Cancel
        </button>
      )}

      {meta && (
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border font-label text-[12px] font-semibold animate-fade-in ${TONE_CLASSES[meta.tone] ?? TONE_CLASSES.muted}`}
        >
          <span
            className={`material-symbols-outlined text-[14px]`}
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            {meta.tone === "live"
              ? "graphic_eq"
              : meta.tone === "success"
                ? "check_circle"
                : meta.tone === "error"
                  ? "error"
                  : "ring_volume"}
          </span>
          {meta.label}
        </span>
      )}

      {error && (
        <span className="font-label text-xs text-on-error-container bg-error-container px-2.5 py-1 rounded-full flex items-center gap-1">
          <span className="material-symbols-outlined text-[14px]">error</span>
          {error}
        </span>
      )}
    </div>
  );
}
