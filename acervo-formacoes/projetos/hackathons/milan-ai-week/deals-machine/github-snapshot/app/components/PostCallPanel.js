"use client";
// PostCallPanel — the "what the agent is doing right now" surface that
// appears on a lead's detail card the moment a call ends. Until it
// finishes processing (transcript → brain learning → draft email), the
// operator sees streaming progress lines. When done, it collapses to a
// compact "what just happened" summary.
//
// Driven entirely by Supabase Realtime:
//   - activity_log INSERTs filtered by lead_id (worker logs every step)
//   - calls UPDATEs filtered by lead_id (transcribed / enrichment fields)
//   - email_drafts INSERTs filtered by lead_id (ready-to-send draft)
//
// The panel auto-mounts when there's a call on this lead within the last
// 15 minutes whose pipeline hasn't fully completed (transcribed=false
// OR no ready email draft yet OR no enrichment yet). It stays open for
// ~30s after everything completes so the operator sees the result.

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/app/lib/supabase";
import {
  subscribeActivityForLead,
  subscribeCallsForLead,
  subscribeDraftsForLead,
} from "@/app/lib/realtime";
import { timeAgoShort } from "@/app/lib/format";

// Look back this far for recent calls when first mounting.
const RECENT_WINDOW_MS = 15 * 60 * 1000;
// After everything's done, keep the panel visible this long.
const COMPLETE_LINGER_MS = 30 * 1000;

const STEPS = [
  { id: "transcribing", label: "Transcribing the call",     icon: "graphic_eq",     desc: "Speechmatics is converting the recording to text." },
  { id: "learning",     label: "Reading the transcript",    icon: "psychology",     desc: "Claude is pulling angles, objections, commitments." },
  { id: "drafting",     label: "Drafting the follow-up",    icon: "edit_note",      desc: "Composing a context-aware email for your review." },
  { id: "done",         label: "Done — ready to send",      icon: "task_alt",       desc: "Draft is on the lead card; brain has been updated." },
];

// Heuristic phase inference. Order matters — we walk the strongest "done"
// signals first so a sent / discarded draft doesn't bounce the panel back
// to an earlier step.
//
// Signals we consider terminal (done):
//   1. A "Follow-up sent" activity line exists.
//   2. An "Auto-drafted follow-up" line exists (the draft was written —
//      even if it was later sent or discarded, the agent finished its job).
//   3. A ready draft is currently in email_drafts.
//
// Order of earlier phases:
//   - drafting → if "Brain learned" line OR call.transcribed OR transcript_ingest type
//   - learning → if a transcript exists but no brain ingest log yet
//   - transcribing → default while a call exists
function inferPhase({ call, activity, hasReadyDraft }) {
  const messages = activity.map((a) => a.message || "");
  const hasSent       = messages.some((m) => m.includes("Follow-up sent") || m.includes("Sent to"));
  const hasAutoDraft  = messages.some((m) => m.includes("Auto-draft"));
  const hasBrain      = messages.some((m) => m.includes("Brain learned"));
  const hasIngestType = activity.some((a) => a.type === "transcript_ingest");
  const hasTranscribe = messages.some((m) => m.includes("Transcrib"));

  if (hasReadyDraft || hasAutoDraft || hasSent) return "done";
  if (call?.transcribed || hasBrain || hasIngestType) return "drafting";
  if (hasTranscribe) return "transcribing";
  if (call) return "transcribing";
  return "transcribing";
}

export default function PostCallPanel({ lead }) {
  const [call, setCall] = useState(null);
  const [activity, setActivity] = useState([]);
  const [draft, setDraft] = useState(null);
  const [shouldLinger, setShouldLinger] = useState(false);
  const lingerTimerRef = useRef(null);

  // Initial sweep — find the most recent call + activity + draft.
  useEffect(() => {
    if (!lead?.id || !supabase) return;
    let cancelled = false;
    (async () => {
      const since = new Date(Date.now() - RECENT_WINDOW_MS).toISOString();
      const [callRes, actRes, draftRes] = await Promise.all([
        supabase
          .from("calls")
          .select(
            "id, lead_id, vertical_id, status, transcribed, transcript_id, recording_duration_seconds, enrichment, outcome_signal, ended_at, created_at",
          )
          .eq("lead_id", lead.id)
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("activity_log")
          .select("id, type, message, created_at")
          .eq("lead_id", lead.id)
          .gte("created_at", since)
          .order("created_at", { ascending: true }),
        supabase
          .from("email_drafts")
          .select("id, lead_id, subject, body, status, created_at")
          .eq("lead_id", lead.id)
          .eq("status", "ready")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      if (cancelled) return;
      setCall(callRes?.data ?? null);
      setActivity(actRes?.data ?? []);
      setDraft(draftRes?.data ?? null);
    })();
    return () => { cancelled = true; };
  }, [lead?.id]);

  // Live subscriptions for the trifecta. CRITICAL: effect deps are only
  // [lead?.id] — the callbacks use functional setState so they never
  // capture stale `draft` / `call` / `activity` state, which means the
  // effect never has to re-run mid-call and tear down its own channels.
  useEffect(() => {
    if (!lead?.id) return;
    const unsubActivity = subscribeActivityForLead(
      lead.id,
      (row) => {
        setActivity((prev) => (prev.some((p) => p.id === row.id) ? prev : [...prev, row]));
      },
      "post-call-panel",
    );
    const unsubCalls = subscribeCallsForLead(
      lead.id,
      (payload) => {
        const row = payload.new || payload.old;
        if (!row) return;
        setCall((prev) => {
          if (!prev || prev.id === row.id || new Date(row.created_at) > new Date(prev.created_at)) {
            return { ...(prev || {}), ...row };
          }
          return prev;
        });
      },
      "post-call-panel",
    );
    const unsubDrafts = subscribeDraftsForLead(
      lead.id,
      (payload) => {
        const row = payload.new || payload.old;
        if (!row) return;
        if (row.status === "ready") {
          setDraft(row);
        } else {
          // Functional update — don't depend on closure-captured draft.
          setDraft((prev) => (prev?.id === row.id ? null : prev));
        }
      },
      "post-call-panel",
    );
    return () => {
      unsubActivity?.();
      unsubCalls?.();
      unsubDrafts?.();
    };
  }, [lead?.id]);

  const phase = useMemo(() => {
    return inferPhase({
      call,
      activity,
      hasReadyDraft: !!draft,
    });
  }, [call, activity, draft]);

  // Keep the panel open for COMPLETE_LINGER_MS after we hit "done".
  useEffect(() => {
    if (phase !== "done") {
      setShouldLinger(false);
      if (lingerTimerRef.current) {
        clearTimeout(lingerTimerRef.current);
        lingerTimerRef.current = null;
      }
      return;
    }
    setShouldLinger(true);
    if (lingerTimerRef.current) clearTimeout(lingerTimerRef.current);
    lingerTimerRef.current = setTimeout(() => setShouldLinger(false), COMPLETE_LINGER_MS);
    return () => {
      if (lingerTimerRef.current) clearTimeout(lingerTimerRef.current);
    };
  }, [phase]);

  // Decide whether to render the panel at all.
  if (!lead?.id) return null;
  // No recent call OR no recent activity — nothing to surface.
  if (!call && activity.length === 0) return null;

  // If the call is ancient (older than window) AND we're already at done
  // AND we already showed it long enough, hide.
  const callIsRecent = call && Date.now() - new Date(call.created_at).getTime() < RECENT_WINDOW_MS;
  if (phase === "done" && !shouldLinger && !callIsRecent) return null;

  // If the call is still in progress, the CoachPanel handles it — don't
  // double up. PostCall takes over once the call has ended.
  if (call && ["initiated", "ringing", "in_progress", "in-progress", "queued"].includes(call.status)) {
    return null;
  }

  const currentStepIndex = STEPS.findIndex((s) => s.id === phase);
  const recentLine = activity[activity.length - 1];

  return (
    <div className="mt-4 rounded-2xl border border-amber-500/40 bg-surface-container-lowest editorial-shadow overflow-hidden animate-fade-up">
      {/* Header — pulses gold while processing, settles to emerald when done */}
      <div
        className={`px-5 py-3 border-b border-outline/10 flex items-center gap-3 ${
          phase === "done"
            ? "bg-tertiary-container/30"
            : "bg-amber-50/70"
        }`}
      >
        <span className="relative flex h-2.5 w-2.5">
          <span
            className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${
              phase === "done" ? "bg-tertiary" : "bg-amber-500 animate-ping"
            }`}
          />
          <span
            className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
              phase === "done" ? "bg-tertiary" : "bg-amber-500"
            }`}
          />
        </span>
        <div className="flex-1 min-w-0">
          <div className={`eyebrow ${phase === "done" ? "text-on-tertiary-container" : "text-amber-700"}`}>
            {phase === "done" ? "Call processed" : "Agent working"}
          </div>
          <div className="font-headline font-extrabold text-on-surface text-[14px] tracking-tight truncate">
            {phase === "done"
              ? "Brain updated · follow-up drafted"
              : STEPS[currentStepIndex]?.label || "Reviewing the call"}
          </div>
        </div>
        {call?.recording_duration_seconds && (
          <div className="font-label text-[11px] text-on-surface-variant tabular-nums">
            {Math.floor(call.recording_duration_seconds / 60)}m {call.recording_duration_seconds % 60}s call
          </div>
        )}
      </div>

      {/* Step strip — 4 dots with the current one filled */}
      <div className="px-5 pt-4">
        <ol className="grid grid-cols-4 gap-1.5">
          {STEPS.map((s, i) => {
            const reached = i <= currentStepIndex;
            const active = i === currentStepIndex && phase !== "done";
            return (
              <li key={s.id} className="flex flex-col items-center text-center">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                    reached
                      ? "bg-on-surface text-background"
                      : "bg-surface-container-high text-on-surface-variant/50"
                  } ${active ? "ring-2 ring-amber-500/40 ring-offset-2 ring-offset-surface-container-lowest" : ""}`}
                >
                  <span
                    className="material-symbols-outlined text-[14px]"
                    style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}
                  >
                    {s.icon}
                  </span>
                </div>
                <div
                  className={`mt-1.5 font-label text-[10.5px] leading-tight ${
                    reached ? "text-on-surface font-semibold" : "text-on-surface-variant/60"
                  }`}
                >
                  {s.label.replace(/^.+ /, (m) => m)}
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      {/* Recent activity log line — the "what's happening NOW" feed */}
      <div className="px-5 pb-4 pt-3 space-y-1.5">
        {activity.slice(-4).reverse().map((a, idx) => (
          <div
            key={a.id ?? `${a.created_at}-${idx}`}
            className={`flex items-start gap-2 font-label text-[12.5px] ${
              idx === 0 ? "text-on-surface font-medium" : "text-on-surface-variant"
            }`}
          >
            <span
              className={`font-mono text-[10.5px] tabular-nums w-[40px] shrink-0 mt-0.5 ${
                idx === 0 ? "text-on-surface-variant" : "text-on-surface-variant/60"
              }`}
            >
              {timeAgoShort(a.created_at)}
            </span>
            <span className="break-words leading-snug min-w-0">{a.message}</span>
          </div>
        ))}
        {activity.length === 0 && call && (
          <div className="font-label text-[12.5px] text-on-surface-variant leading-snug">
            Recording handed off to Speechmatics. Updates land here as the
            agent works.
          </div>
        )}
      </div>

      {/* Result strip — only when we have a draft AND a scorecard hint */}
      {draft && (
        <div className="border-t border-outline/10 px-5 py-3 bg-surface-container-low/40 flex items-center gap-3">
          <span
            className="material-symbols-outlined text-tertiary text-[18px] shrink-0"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            mark_email_unread
          </span>
          <div className="min-w-0 flex-1">
            <div className="font-headline font-bold text-[13px] text-on-surface tracking-tight truncate">
              Follow-up ready · "{draft.subject}"
            </div>
            <div className="font-label text-[11.5px] text-on-surface-variant truncate">
              Review it at the top of this card · sent only when you hit "Send now"
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
