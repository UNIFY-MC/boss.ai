"use client";
// TranscriptPasteModal — the demo-safe fallback for transcript ingestion.
//
// Lets the operator (or a judge) paste a call transcript directly instead of
// recording audio. The worker treats text_paste, audio_upload, and
// fireflies_auto sources identically — same brain-extraction pipeline runs.
//
// Critical for live demos: the audio pipeline depends on Speechmatics +
// Twilio working in the room. Paste-fallback removes that dependency.

import { useEffect, useRef, useState } from "react";

export default function TranscriptPasteModal({ lead, verticalId, onClose, onIngested }) {
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;

  // Transcripts belong to leads, and every lead carries its own vertical_id.
  // Prefer that over whatever filter the operator has on the leads list.
  const resolvedVerticalId = lead?.vertical_id ?? verticalId;

  const submit = async () => {
    if (!text.trim()) return;
    if (!resolvedVerticalId) {
      setError("Couldn't resolve which vertical this lead belongs to. Refresh and try again.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/transcripts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vertical_id: resolvedVerticalId,
          lead_id: lead?.id,
          text: text.trim(),
          source: "text_paste",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message ?? data?.error ?? `HTTP ${res.status}`);
      }
      setResult(data);
      onIngested?.(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm" onClick={onClose} />
      <div className="glass-panel relative w-full max-w-2xl rounded-3xl editorial-shadow-lg animate-scale-in max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-7 pt-6 pb-4 border-b border-outline/10">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="eyebrow text-on-surface-variant mb-1.5">Paste call transcript</div>
              <div className="font-headline text-xl font-bold text-on-surface tracking-tight">
                {lead?.name ?? "Unattached transcript"}
              </div>
              {lead?.company && (
                <div className="font-mono text-[12px] text-on-surface-variant mt-0.5 truncate">
                  {lead.company}
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              className="shrink-0 w-9 h-9 rounded-full hover:bg-surface-container-high flex items-center justify-center transition-colors"
              aria-label="Close"
            >
              <span className="material-symbols-outlined text-on-surface-variant text-[20px]">close</span>
            </button>
          </div>
        </div>

        {/* Body */}
        {result ? (
          <SuccessState result={result} onClose={onClose} />
        ) : (
          <div className="p-7 space-y-4 overflow-y-auto">
            <div>
              <div className="eyebrow text-on-surface-variant mb-2">Transcript</div>
              <textarea
                ref={textareaRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste the call transcript here. Speaker labels optional — the agent will extract angles, objections, and profile signals regardless."
                rows={12}
                className="w-full px-4 py-3.5 rounded-xl border border-outline/15 bg-surface-container-lowest focus:outline-none focus:border-on-surface/40 font-label text-[14.5px] leading-[1.65] tracking-[-0.005em] resize-none"
              />
              <div className="flex items-center justify-between mt-2">
                <div className="font-label text-[11px] text-on-surface-variant">
                  {wordCount > 0 ? `${wordCount} words` : "Empty"}
                </div>
                <div className="font-label text-[11px] text-on-surface-variant/80">
                  Same brain pipeline as audio uploads — runs Lobster Trap → Claude extraction.
                </div>
              </div>
            </div>

            {error && (
              <div className="rounded-xl bg-error-container/60 border border-error/30 px-4 py-3 font-label text-sm text-on-error-container flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">error</span>
                {error}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl font-headline font-semibold text-sm text-on-surface-variant hover:bg-surface-container transition-colors"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={submitting || !text.trim()}
                className="metallic-silk gleam-hover text-on-primary px-6 py-3 rounded-xl font-headline font-bold text-sm shadow-lg disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-px transition-all inline-flex items-center gap-2.5"
              >
                {submitting ? (
                  <>
                    <span className="material-symbols-outlined text-[18px] animate-spin">
                      progress_activity
                    </span>
                    Extracting brain entries…
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">psychology</span>
                    Ingest transcript
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

function SuccessState({ result, onClose }) {
  const entries = result?.brain_entries_added ?? result?.entries_added ?? 0;
  return (
    <div className="p-7 flex flex-col items-center text-center gap-4 animate-fade-in">
      <div className="w-16 h-16 rounded-full bg-tertiary-container flex items-center justify-center">
        <span
          className="material-symbols-outlined text-on-tertiary-container text-[32px]"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          check_circle
        </span>
      </div>
      <div>
        <div className="font-headline text-lg font-bold text-on-surface tracking-tight">
          Transcript ingested
        </div>
        <div className="font-label text-sm text-on-surface-variant mt-1 max-w-md">
          The brain extracted{" "}
          <span className="font-mono font-semibold text-on-surface">{entries}</span>{" "}
          new entries. The next agent run will reflect what was learned.
        </div>
      </div>
      <button
        onClick={onClose}
        className="metallic-silk gleam-hover text-on-primary px-6 py-3 rounded-xl font-headline font-bold text-sm shadow-lg hover:-translate-y-px transition-all mt-2"
      >
        Done
      </button>
    </div>
  );
}
