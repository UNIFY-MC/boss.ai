"use client";
// FollowUpEmailModal — opens from the leads page "Send follow-up email"
// action. Drafts via Claude (vertical-aware), lets the operator edit
// subject + body, refines via a chat-style instruction loop, sends via
// Gmail OAuth when connected (falls back to Resend platform email).

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

export default function FollowUpEmailModal({ lead, prefilledDraft, onClose, onSent, onDiscard }) {
  const [stage, setStage] = useState(prefilledDraft ? "ready" : "drafting");
  const [draft, setDraft] = useState(
    prefilledDraft
      ? { subject: prefilledDraft.subject, body: prefilledDraft.body }
      : { subject: "", body: "" }
  );
  const [draftId] = useState(prefilledDraft?.id ?? null);
  const [error, setError] = useState(null);
  const [refineInput, setRefineInput] = useState("");
  const [refining, setRefining] = useState(false);
  const [sender, setSender] = useState({ kind: "loading" });

  useEffect(() => {
    let alive = true;
    fetch("/api/auth/google/status", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (!alive) return;
        if (data?.connected) {
          setSender({ kind: "gmail", email: data.email, name: data.display_name });
        } else {
          setSender({ kind: "platform" });
        }
      })
      .catch(() => alive && setSender({ kind: "platform" }));
    return () => {
      alive = false;
    };
  }, []);

  const fetchDraft = useCallback(async () => {
    setStage("drafting");
    setError(null);
    try {
      const res = await fetch("/api/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "draft", lead_id: lead.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setDraft(data.email || { subject: "", body: "" });
      setStage("ready");
    } catch (err) {
      setError(err.message);
      setStage("error");
    }
  }, [lead.id]);

  useEffect(() => {
    if (prefilledDraft) return;
    fetchDraft();
  }, [fetchDraft, prefilledDraft]);

  const handleRefine = async () => {
    if (!refineInput.trim() || refining) return;
    setRefining(true);
    setError(null);
    try {
      const res = await fetch("/api/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "refine", current: draft, instruction: refineInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      if (data.email) setDraft(data.email);
      setRefineInput("");
    } catch (err) {
      setError(err.message);
    } finally {
      setRefining(false);
    }
  };

  const handleSend = async () => {
    if (!lead.email) {
      setError("Lead has no email on file.");
      setStage("error");
      return;
    }
    setStage("sending");
    setError(null);
    try {
      const res = await fetch("/api/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send",
          lead_id: lead.id,
          to: lead.email,
          subject: draft.subject,
          body: draft.body,
          draft_id: draftId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setStage("sent");
      if (onSent) onSent({ ...data, lead });
      setTimeout(() => onClose && onClose(), 1600);
    } catch (err) {
      setError(err.message);
      setStage("error");
    }
  };

  const recipient = lead.name || "Unknown";

  return (
    <div
      className="fixed inset-0 z-50 bg-on-surface/45 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
      onClick={stage === "sending" ? undefined : onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="glass-panel rounded-2xl editorial-shadow-lg w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-scale-in"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-outline/10 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="eyebrow text-on-surface-variant/70 mb-0.5">
              {prefilledDraft ? "Pre-drafted by agent" : "Follow-up email"}
            </div>
            <div className="font-headline font-extrabold text-xl text-on-surface tracking-tight">
              {recipient}
            </div>
            {lead.email && (
              <div className="font-mono text-[12px] text-on-surface-variant mt-0.5 truncate">
                {lead.email}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            disabled={stage === "sending"}
            className="text-on-surface-variant hover:text-on-surface flex-shrink-0 p-1.5 rounded-lg hover:bg-surface-container-high transition-colors disabled:opacity-50"
            aria-label="Close"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {stage === "drafting" && <DraftingState />}

          {(stage === "ready" || stage === "sending" || stage === "error") && (
            <>
              <Field label="Subject">
                <input
                  value={draft.subject}
                  onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
                  disabled={stage === "sending"}
                  className="w-full px-3.5 py-2.5 bg-surface-container-lowest border border-outline/15 rounded-xl text-sm font-headline font-medium text-on-surface focus:outline-none focus:border-on-surface/40 transition-colors disabled:opacity-60"
                />
              </Field>
              <Field label="Body">
                <textarea
                  value={draft.body}
                  onChange={(e) => setDraft({ ...draft, body: e.target.value })}
                  disabled={stage === "sending"}
                  rows={12}
                  className="w-full px-3.5 py-3 bg-surface-container-lowest border border-outline/15 rounded-xl text-[13.5px] font-label text-on-surface leading-relaxed focus:outline-none focus:border-on-surface/40 transition-colors disabled:opacity-60"
                />
              </Field>

              <div className="bg-surface-container-lowest rounded-xl p-3.5 border border-outline/10">
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="material-symbols-outlined text-on-surface-variant text-[14px]">
                    auto_fix_high
                  </span>
                  <div className="eyebrow text-on-surface-variant">
                    Refine with a quick instruction
                  </div>
                </div>
                <div className="flex gap-2">
                  <input
                    value={refineInput}
                    onChange={(e) => setRefineInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleRefine()}
                    placeholder='e.g., "make it shorter" or "add a Tuesday timeframe"'
                    disabled={refining || stage === "sending"}
                    className="flex-1 px-3 py-2 bg-surface-container-low border border-outline/15 rounded-lg text-sm font-label focus:outline-none focus:border-on-surface/40 transition-colors disabled:opacity-50"
                  />
                  <button
                    onClick={handleRefine}
                    disabled={!refineInput.trim() || refining || stage === "sending"}
                    className="px-4 py-2 bg-on-surface text-background rounded-lg font-headline text-sm font-bold disabled:opacity-50 hover:opacity-90 transition-opacity inline-flex items-center gap-1.5"
                  >
                    {refining ? <Spinner /> : <span className="material-symbols-outlined text-[16px]">auto_awesome</span>}
                    {refining ? "Refining" : "Refine"}
                  </button>
                </div>
              </div>
            </>
          )}

          {stage === "sent" && <SentState />}

          {error && (
            <div className="bg-error-container border border-error/30 text-on-error-container rounded-xl px-3.5 py-2.5 text-sm font-label flex items-start gap-2">
              <span className="material-symbols-outlined text-[18px] mt-0.5">error</span>
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        {stage !== "sent" && (
          <div className="px-6 py-4 border-t border-outline/10 flex items-center justify-between gap-4 flex-wrap bg-surface-container-low/50">
            <div className="min-w-0 flex-1">
              <SenderLine sender={sender} />
            </div>
            <div className="flex gap-2 flex-shrink-0">
              {prefilledDraft && onDiscard && (
                <button
                  onClick={() => {
                    onDiscard();
                    onClose?.();
                  }}
                  disabled={stage === "sending"}
                  className="px-3.5 py-2.5 rounded-xl font-label text-sm font-medium text-on-surface-variant hover:bg-error-container hover:text-on-error-container disabled:opacity-50 transition-colors inline-flex items-center gap-1.5 whitespace-nowrap"
                  title="Discard this draft so it doesn't pop back open"
                >
                  <span className="material-symbols-outlined text-[16px]">delete</span>
                  Don't send
                </button>
              )}
              <button
                onClick={onClose}
                disabled={stage === "sending"}
                className="px-3.5 py-2.5 rounded-xl font-label text-sm font-medium text-on-surface-variant hover:bg-surface-container-high disabled:opacity-50 transition-colors whitespace-nowrap"
              >
                Cancel
              </button>
              <button
                onClick={handleSend}
                disabled={
                  stage !== "ready" || !draft.subject || !draft.body || !lead.email
                }
                className="metallic-silk gleam-hover text-on-primary px-5 py-2.5 rounded-xl font-headline font-bold text-sm shadow-lg disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-px transition-all flex items-center gap-2 whitespace-nowrap"
              >
                {stage === "sending" ? (
                  <>
                    <Spinner />
                    Sending…
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">send</span>
                    Send email
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ────────────────────────── States ────────────────────────── */

function DraftingState() {
  return (
    <div className="text-center py-16">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-surface-container-high mb-3 relative">
        <span
          className="material-symbols-outlined text-on-surface text-[28px] animate-pulse"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          edit_note
        </span>
        <span className="absolute -inset-1 rounded-2xl border-2 border-on-surface/10 animate-pulse" />
      </div>
      <div className="font-headline font-bold text-on-surface mb-1 tracking-tight">
        Claude is drafting
      </div>
      <p className="font-label text-sm text-on-surface-variant max-w-sm mx-auto">
        Reading the vertical's voice and what the brain remembers about this lead…
      </p>
    </div>
  );
}

function SentState() {
  return (
    <div className="text-center py-12 animate-fade-up">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-tertiary-container mb-3">
        <span
          className="material-symbols-outlined text-tertiary text-[32px]"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          mark_email_read
        </span>
      </div>
      <div className="font-headline font-extrabold text-xl text-on-surface tracking-tight mb-1">
        Sent
      </div>
      <p className="font-label text-sm text-on-surface-variant max-w-sm mx-auto">
        Lead status flipped to <span className="font-bold text-on-surface">Follow up</span>.
        Closing automatically…
      </p>
    </div>
  );
}

function SenderLine({ sender }) {
  if (sender.kind === "loading") {
    return (
      <div className="font-label text-[11.5px] text-on-surface-variant">
        Drafted with Claude · checking sender…
      </div>
    );
  }
  if (sender.kind === "gmail") {
    return (
      <div className="font-label text-[11.5px] text-on-surface-variant inline-flex items-center gap-1.5">
        <span className="material-symbols-outlined text-tertiary text-[14px]">mark_email_read</span>
        Sending from your Gmail{" "}
        <span className="font-mono font-medium text-on-surface">{sender.email}</span>
        <span className="text-on-surface-variant/60">· drafted with Claude</span>
      </div>
    );
  }
  return (
    <div className="font-label text-[11.5px] text-on-surface-variant inline-flex items-center gap-1.5 flex-wrap">
      <span className="material-symbols-outlined text-[14px]">mail</span>
      Sending via platform email
      <span className="text-on-surface-variant/60">· drafted with Claude ·</span>
      <Link
        href="/settings?gmail=cta"
        className="underline font-semibold text-on-surface hover:text-on-surface/80"
      >
        connect Gmail
      </Link>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="eyebrow text-on-surface-variant block mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function Spinner() {
  return (
    <svg
      className="w-4 h-4 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />
      <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}
