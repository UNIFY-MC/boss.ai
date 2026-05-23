"use client";
// UploadDocumentModal — feeds a sales document (PDF / TXT / MD / CSV)
// into Claude, which extracts structured brain entries. Used from the
// Knowledge page next to "Add manual insight".

import { useRef, useState } from "react";

const ACCEPT =
  ".pdf,.txt,.md,.csv,application/pdf,text/plain,text/markdown,text/csv";

export default function UploadDocumentModal({
  verticals,
  defaultVerticalId,
  onClose,
  onUploaded,
}) {
  const [verticalId, setVerticalId] = useState(
    defaultVerticalId || verticals[0]?.id || ""
  );
  const [file, setFile] = useState(null);
  const [context, setContext] = useState("");
  const [stage, setStage] = useState("idle");
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  const handleUpload = async () => {
    if (!file || !verticalId || stage === "uploading") return;
    setStage("uploading");
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("vertical_id", verticalId);
      if (context.trim()) form.append("context", context.trim());
      const res = await fetch("/api/knowledge/upload", {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setResult(data);
      setStage("done");
    } catch (err) {
      setError(err.message);
      setStage("error");
    }
  };

  const handleDoneClose = () => {
    if (onUploaded) onUploaded();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-on-surface/45 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={stage === "uploading" ? undefined : onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="glass-panel rounded-2xl editorial-shadow-lg max-w-lg w-full p-6 animate-scale-in"
      >
        <div className="mb-5">
          <div className="eyebrow text-on-surface-variant/70 mb-1">Knowledge</div>
          <h2 className="font-headline font-extrabold text-xl text-on-surface tracking-tight">
            Upload a document
          </h2>
          <p className="font-label text-[13px] text-on-surface-variant mt-1 leading-relaxed">
            The agent reads the file and extracts structured insights into the brain. PDF, text, markdown, or CSV — up to 4&nbsp;MB.
          </p>
        </div>

        {(stage === "idle" || stage === "error") && (
          <>
            <Field label="Vertical">
              <select
                value={verticalId}
                onChange={(e) => setVerticalId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-surface-container-lowest border border-outline/15 rounded-xl text-sm font-label text-on-surface focus:outline-none focus:border-on-surface/40 transition-colors cursor-pointer"
              >
                {verticals.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.display_name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="File">
              <div
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.add("border-on-surface/40", "bg-surface-container-high/50");
                }}
                onDragLeave={(e) => {
                  e.currentTarget.classList.remove("border-on-surface/40", "bg-surface-container-high/50");
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.remove("border-on-surface/40", "bg-surface-container-high/50");
                  const dropped = e.dataTransfer.files?.[0];
                  if (dropped) setFile(dropped);
                }}
                className="p-6 border-2 border-dashed border-outline/25 rounded-2xl text-center cursor-pointer hover:bg-surface-container-high/30 transition-colors"
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept={ACCEPT}
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
                {file ? (
                  <>
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-surface-container-high mb-2">
                      <span
                        className="material-symbols-outlined text-on-surface text-[24px]"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        description
                      </span>
                    </div>
                    <div className="font-headline font-bold text-sm text-on-surface truncate tracking-tight">
                      {file.name}
                    </div>
                    <div className="font-label text-[11.5px] text-on-surface-variant mt-1">
                      {(file.size / 1024).toFixed(1)} KB · click to change
                    </div>
                  </>
                ) : (
                  <>
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-surface-container-high mb-2">
                      <span className="material-symbols-outlined text-on-surface-variant text-[24px]">
                        upload_file
                      </span>
                    </div>
                    <div className="font-headline font-bold text-sm text-on-surface tracking-tight">
                      Drop a file or click to choose
                    </div>
                    <div className="font-label text-[11.5px] text-on-surface-variant mt-1">
                      PDF · TXT · MD · CSV
                    </div>
                  </>
                )}
              </div>
            </Field>

            <Field label="Context (optional)">
              <textarea
                value={context}
                onChange={(e) => setContext(e.target.value)}
                rows={2}
                placeholder='e.g. "2024 win/loss report" or "Common objections from the EU market"'
                className="w-full px-3.5 py-2.5 bg-surface-container-lowest border border-outline/15 rounded-xl text-sm font-label text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:border-on-surface/40 transition-colors"
              />
            </Field>

            {error && (
              <div className="bg-error-container border border-error/30 text-on-error-container rounded-xl px-3.5 py-2.5 mb-4 text-sm font-label flex items-start gap-2">
                <span className="material-symbols-outlined text-[18px] mt-0.5">error</span>
                {error}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-outline/10">
              <button
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-on-surface-variant hover:bg-surface-container-high font-label text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={!file || !verticalId}
                className="metallic-silk gleam-hover text-on-primary px-5 py-2.5 rounded-xl font-headline font-bold text-sm shadow-lg disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-px transition-all flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
                Extract insights
              </button>
            </div>
          </>
        )}

        {stage === "uploading" && (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-surface-container-high mb-3 relative">
              <span
                className="material-symbols-outlined text-on-surface text-[28px] animate-pulse"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                psychology
              </span>
              <span className="absolute -inset-1 rounded-2xl border-2 border-on-surface/10 animate-pulse" />
            </div>
            <div className="font-headline font-bold text-on-surface tracking-tight">
              Claude is reading your document
            </div>
            <p className="font-label text-sm text-on-surface-variant mt-1 max-w-sm mx-auto">
              Extracting structured insights — usually ~10 seconds.
            </p>
          </div>
        )}

        {stage === "done" && result && (
          <div className="text-center py-8 animate-fade-up">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-tertiary-container mb-3">
              <span
                className="material-symbols-outlined text-tertiary text-[32px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                check_circle
              </span>
            </div>
            <div className="font-headline font-extrabold text-xl text-on-surface tracking-tight">
              {result.inserted} insight{result.inserted === 1 ? "" : "s"} added
            </div>
            {result.summary && (
              <div className="font-label text-[13px] text-on-surface-variant mt-2 max-w-md mx-auto leading-relaxed">
                {result.summary}
              </div>
            )}
            {result.types_seen?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 justify-center mt-4 max-w-sm mx-auto">
                {result.types_seen.map((t) => (
                  <span
                    key={t}
                    className="font-label text-[10.5px] px-2.5 py-0.5 rounded-full bg-surface-container-high text-on-surface font-bold uppercase tracking-wider"
                  >
                    {t.replace(/_/g, " ")}
                  </span>
                ))}
              </div>
            )}
            <button
              onClick={handleDoneClose}
              className="mt-6 metallic-silk gleam-hover text-on-primary px-5 py-2.5 rounded-xl font-headline font-bold text-sm shadow-lg hover:-translate-y-px transition-all"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="mb-4">
      <label className="eyebrow text-on-surface-variant block mb-1.5">{label}</label>
      {children}
    </div>
  );
}
