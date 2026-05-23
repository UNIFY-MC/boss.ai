"use client";
// CallReviewModal — fires after a call's batch transcript + enrichment land.
//
// Shows:
//   - "What worked / What to improve" scorecard (from worker /enrich-call)
//   - Confirmation checklist (email, phone, time, next step) with edit
//   - "Save to lead" button: applies confirmations to leads row + auto-moves
//     pipeline_stage if outcome_signal warrants

import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabase";

const OUTCOME_LABEL = {
  meeting_set:         "Meeting set",
  qualified_interest:  "Qualified interest",
  objection_unhandled: "Objection unhandled",
  killed:              "Killed",
  voicemail:           "Voicemail",
  no_answer:           "No answer",
  follow_up_needed:    "Follow-up needed",
};

const OUTCOME_TO_STAGE = {
  meeting_set:        "meeting_set",
  qualified_interest: "qualified",
  killed:             "closed_lost",
};

export default function CallReviewModal({ call, lead, onClose, onApplied }) {
  const [enrichment, setEnrichment] = useState(call?.enrichment || null);
  const [loading, setLoading] = useState(!call?.enrichment);
  const [error, setError] = useState(null);
  const [confirmations, setConfirmations] = useState([]);
  const [saving, setSaving] = useState(false);

  // Trigger enrichment if not already on the call row
  useEffect(() => {
    if (enrichment || !call?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/enrich-call", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ call_id: call.id }),
        });
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok || !json.ok) {
          const raw = json.error || "Enrichment failed";
          // Translate the worker's "Transcript not ready" into a friendlier message
          if (/transcript not ready/i.test(raw)) {
            throw new Error(
              "The recording is still being transcribed. Speechmatics usually takes 30-90 seconds after the call ends — try again shortly.",
            );
          }
          // Suppress raw Zod validation dumps — they leak ugly JSON to the user.
          // The retry usually works since the LLM drift is random.
          if (/invalid_value|invalid_type|expected one of|"path":/i.test(raw)) {
            throw new Error(
              "The scoring model returned unexpected fields. This is usually a transient glitch — try Review last call again.",
            );
          }
          throw new Error(raw);
        }
        setEnrichment(json.enrichment);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [call?.id, enrichment]);

  // Initialize confirmation list from enrichment
  useEffect(() => {
    if (!enrichment) return;
    setConfirmations(
      (enrichment.confirmations || []).map((c) => ({ ...c, accept: c.confirmed })),
    );
  }, [enrichment]);

  const updateConf = (i, patch) =>
    setConfirmations((prev) => prev.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));

  const apply = async () => {
    if (!lead?.id || !supabase) return;
    setSaving(true);

    const patch = { updated_at: new Date().toISOString() };
    for (const c of confirmations) {
      if (!c.accept || !c.value?.trim()) continue;
      if (c.kind === "email") patch.email = c.value.trim();
      else if (c.kind === "phone") patch.phone = c.value.trim();
      else if (c.kind === "next_step") patch.next_action = c.value.trim();
      else if (c.kind === "time") patch.next_action_due = parseDate(c.value);
    }

    // Auto-move pipeline stage from outcome_signal
    const newStage = OUTCOME_TO_STAGE[enrichment?.outcome_signal];
    if (newStage && newStage !== lead.pipeline_stage) {
      patch.pipeline_stage = newStage;
      patch.pipeline_stage_at = new Date().toISOString();
    }

    const { error: upErr } = await supabase
      .from("leads")
      .update(patch)
      .eq("id", lead.id);
    setSaving(false);
    if (upErr) {
      setError(upErr.message);
      return;
    }
    onApplied?.({ ...lead, ...patch });
    onClose?.();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm" onClick={onClose} />
      <div className="glass-panel relative w-full max-w-2xl rounded-3xl editorial-shadow-lg animate-scale-in max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-7 pt-6 pb-4 border-b border-outline/10 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="eyebrow text-on-surface-variant mb-1.5">Call review</div>
            <div className="font-headline text-xl font-bold text-on-surface tracking-tight">
              {lead?.name || "Lead"} · {OUTCOME_LABEL[enrichment?.outcome_signal] || "Scoring…"}
            </div>
            <div className="font-label text-[12px] text-on-surface-variant mt-0.5">
              Confirm what was agreed to. Save applies it to the lead + moves the pipeline stage.
            </div>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 w-9 h-9 rounded-full hover:bg-surface-container-high flex items-center justify-center transition-colors"
            aria-label="Close"
          >
            <span className="material-symbols-outlined text-on-surface-variant text-[20px]">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-7 space-y-5 overflow-y-auto">
          {loading && (
            <div className="space-y-3">
              <div className="skeleton h-6 w-40" />
              <div className="skeleton h-16 w-full" />
              <div className="skeleton h-16 w-full" />
            </div>
          )}

          {error && (
            <div className="rounded-xl bg-error-container/60 border border-error/30 px-4 py-3 font-label text-sm text-on-error-container">
              {error}
            </div>
          )}

          {enrichment && (
            <>
              {/* What worked */}
              {enrichment.what_worked?.length > 0 && (
                <Section title="What worked" tone="emerald">
                  <ul className="space-y-2">
                    {enrichment.what_worked.map((w, i) => (
                      <li key={i} className="rounded-lg border border-tertiary/20 bg-tertiary-container/30 px-3.5 py-2.5">
                        <div className="font-label text-[10.5px] uppercase tracking-wider font-bold text-on-tertiary-container">
                          {w.section}
                        </div>
                        <div className="font-label text-[13px] text-on-surface mt-0.5 leading-relaxed">
                          {w.note}
                        </div>
                        {w.quote && (
                          <div className="font-label text-[11.5px] text-on-surface-variant italic mt-1.5">
                            "{w.quote}"
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </Section>
              )}

              {/* What to improve */}
              {enrichment.what_to_improve?.length > 0 && (
                <Section title="What to improve">
                  <ul className="space-y-2">
                    {enrichment.what_to_improve.map((w, i) => (
                      <li key={i} className="rounded-lg border border-amber-500/20 bg-amber-50/40 px-3.5 py-2.5">
                        <div className="font-label text-[10.5px] uppercase tracking-wider font-bold text-amber-900">
                          {w.section}
                        </div>
                        <div className="font-label text-[13px] text-on-surface mt-0.5 leading-relaxed">
                          {w.note}
                        </div>
                      </li>
                    ))}
                  </ul>
                </Section>
              )}

              {/* Confirmation checklist */}
              {confirmations.length > 0 && (
                <Section title="Confirmation checklist">
                  <div className="space-y-2.5">
                    {confirmations.map((c, i) => (
                      <div key={i} className="flex items-center gap-3 rounded-xl border border-outline/15 bg-surface-container-lowest px-3.5 py-2.5">
                        <input
                          type="checkbox"
                          checked={!!c.accept}
                          onChange={(e) => updateConf(i, { accept: e.target.checked })}
                          className="w-4 h-4 accent-on-surface shrink-0"
                        />
                        <div className="font-label text-[10.5px] uppercase tracking-wider font-bold text-on-surface-variant shrink-0 w-20">
                          {c.kind}
                        </div>
                        <input
                          type="text"
                          value={c.value}
                          onChange={(e) => updateConf(i, { value: e.target.value })}
                          className="flex-1 min-w-0 bg-transparent font-label text-[13.5px] text-on-surface focus:outline-none"
                        />
                      </div>
                    ))}
                  </div>
                </Section>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-7 py-4 border-t border-outline/10 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2.5 rounded-xl font-headline font-semibold text-sm text-on-surface-variant hover:bg-surface-container transition-colors"
          >
            Skip
          </button>
          <button
            onClick={apply}
            disabled={saving || loading || !enrichment}
            className="metallic-silk gleam-hover text-on-primary px-6 py-3 rounded-xl font-headline font-bold text-sm shadow-lg disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-px transition-all inline-flex items-center gap-2.5"
          >
            {saving ? (
              <>
                <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                Saving…
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]">save</span>
                Save to lead
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, tone, children }) {
  return (
    <div>
      <h3 className={`font-headline font-extrabold text-[13px] tracking-tight uppercase mb-2 ${tone === "emerald" ? "text-tertiary" : "text-on-surface-variant"}`}>
        {title}
      </h3>
      {children}
    </div>
  );
}

function parseDate(value) {
  if (!value) return null;
  // Best-effort: if value looks like a date or "Tuesday 2pm", let Date parse.
  const d = new Date(value);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
}
