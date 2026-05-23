"use client";
import { Suspense, useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import AppShell from "../components/AppShell";
import VerticalSwitcher from "../components/VerticalSwitcher";
import StreamingReasoningPanel from "../components/StreamingReasoningPanel";
import CallerIDVerificationModal from "../components/CallerIDVerificationModal";
import { supabase } from "../lib/supabase";
import { subscribeRun } from "../lib/realtime";

export default function IntelligencePage() {
  return (
    <Suspense
      fallback={
        <AppShell>
          <div className="text-on-surface-variant text-sm py-12 text-center">Loading…</div>
        </AppShell>
      }
    >
      <IntelligencePageInner />
    </Suspense>
  );
}

function IntelligencePageInner() {
  const params = useSearchParams();
  const router = useRouter();
  const initialSlug = params?.get("vertical") || null;
  const autorunRequested = params?.get("autorun") === "1";
  const [vertical, setVertical] = useState(null);
  const [runId, setRunId] = useState(null);
  const [runStatus, setRunStatus] = useState(null);
  const [runSummary, setRunSummary] = useState(null);
  const [leadCount, setLeadCount] = useState(0);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [error, setError] = useState(null);
  const [starting, setStarting] = useState(false);
  // Guard so the autorun handler only fires once per page load. Without it,
  // every re-render where `vertical` changes (e.g. switching dropdown) would
  // re-trigger the run.
  const autoranRef = useRef(false);

  const refreshLeadCount = useCallback(async () => {
    if (!runId || !supabase) return setLeadCount(0);
    const { count } = await supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("run_id", runId);
    setLeadCount(count ?? 0);
  }, [runId]);

  useEffect(() => {
    refreshLeadCount();
    if (!runId) return;
    const id = setInterval(refreshLeadCount, 3000);
    return () => clearInterval(id);
  }, [runId, refreshLeadCount]);

  useEffect(() => {
    if (!runId) return;
    return subscribeRun(runId, (row) => {
      setRunStatus(row.status);
      if (row.summary) setRunSummary(row.summary);
    });
  }, [runId]);

  const handleRun = useCallback(async () => {
    if (!vertical || starting) return;
    setError(null);
    setStarting(true);
    setRunSummary(null);
    setLeadCount(0);
    try {
      const res = await fetch("/api/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vertical_id: vertical.id, triggered_by: "manual" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || data?.error || `HTTP ${res.status}`);
      setRunId(data.run_id);
      setRunStatus("running");
    } catch (err) {
      setError(err.message);
    } finally {
      setStarting(false);
    }
  }, [vertical, starting]);

  // Autorun: when the page loads with ?autorun=1, fire handleRun once the
  // VerticalSwitcher has resolved a vertical. Then strip the param from the
  // URL so a refresh doesn't re-fire.
  useEffect(() => {
    if (!autorunRequested) return;
    if (autoranRef.current) return;
    if (!vertical) return;
    autoranRef.current = true;
    handleRun();
    // Strip ?autorun from the URL without a full navigation.
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete("autorun");
      router.replace(url.pathname + url.search, { scroll: false });
    } catch (_) {}
  }, [autorunRequested, vertical, handleRun, router]);

  const running = runStatus === "running" || runStatus === "queued";
  const complete = runStatus === "complete";
  const failed = runStatus === "failed";

  // ICP summary chips (preview of what the agent's about to do)
  const icp = vertical?.config?.icp ?? {};
  const sources = vertical?.config?.signal_source?.sources ?? [];

  return (
    <AppShell>
      {/* Hero header */}
      <div className="mb-6">
        <div className="eyebrow text-on-surface-variant/70 mb-1">Run the agent</div>
        <h1 className="display-1 text-on-surface" style={{ fontSize: "2.25rem" }}>
          Intelligence
        </h1>
        <p className="font-label text-sm text-on-surface-variant mt-2 max-w-2xl">
          Pick a vertical. Watch the agent reason through signals, build consequence chains,
          source leads, and write scripts — live.
        </p>
      </div>

      {/* Run control card */}
      <div className="bg-surface-container-low rounded-2xl editorial-shadow mb-6 relative">
        <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-5 items-end">
          <div className="lg:col-span-7 space-y-4">
            <div>
              <div className="eyebrow text-on-surface-variant mb-2">
                Active vertical
              </div>
              <VerticalSwitcher onChange={setVertical} initialSlug={initialSlug} />
            </div>

            {vertical && (
              <div className="flex flex-wrap gap-1.5 animate-fade-in">
                {(icp.titles ?? []).slice(0, 3).map((t) => (
                  <Pill key={t} icon="badge">
                    {t}
                  </Pill>
                ))}
                {icp.company_size_range && (
                  <Pill icon="business">
                    {icp.company_size_range[0]}–{icp.company_size_range[1]} employees
                  </Pill>
                )}
                {(icp.countries ?? []).slice(0, 2).map((c) => (
                  <Pill key={c} icon="public">
                    {c}
                  </Pill>
                ))}
                {sources.length > 0 && (
                  <Pill icon="rss_feed">
                    {sources.length} source{sources.length === 1 ? "" : "s"}
                  </Pill>
                )}
              </div>
            )}
          </div>

          <div className="lg:col-span-5 flex flex-col items-end gap-2">
            <button
              onClick={handleRun}
              disabled={!vertical || starting || running}
              className={`group w-full lg:w-auto px-7 py-3.5 rounded-2xl font-headline font-bold text-sm shadow-lg transition-all flex items-center justify-center gap-2 ${
                !vertical || starting || running
                  ? "bg-surface-container-high text-on-surface-variant/60 cursor-not-allowed shadow-none"
                  : "metallic-silk text-on-primary hover:-translate-y-px hover:shadow-xl"
              }`}
            >
              {starting ? (
                <>
                  <Spinner />
                  Starting agent…
                </>
              ) : running ? (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-white opacity-75 animate-ping"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                  </span>
                  Agent running…
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[20px]">
                    play_arrow
                  </span>
                  Run agent
                </>
              )}
            </button>
            {!running && !runId && (
              <div className="font-label text-[11px] text-on-surface-variant/60 text-right">
                One click. Free until Apollo step (~$0.10 / run).
              </div>
            )}
          </div>
        </div>

        {/* Run status strip */}
        {runId && (
          <div
            className={`border-t border-outline/10 px-6 py-4 flex items-center justify-between gap-4 flex-wrap ${
              complete
                ? "bg-tertiary-container/40"
                : failed
                  ? "bg-error-container/30"
                  : "bg-surface-container"
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <StatusDot status={runStatus} />
              <div className="min-w-0">
                <div className="font-headline font-bold text-sm text-on-surface tracking-tight">
                  {complete
                    ? "Run complete"
                    : failed
                      ? "Run failed"
                      : "Agent is working…"}
                </div>
                {runSummary && (
                  <div className="font-label text-xs text-on-surface-variant mt-0.5 truncate max-w-[60ch]">
                    {runSummary}
                  </div>
                )}
              </div>
            </div>

            {leadCount > 0 && (
              <Link
                href={`/leads?run=${runId}`}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-on-surface text-background font-headline font-bold text-sm hover:bg-on-surface/90 transition-colors"
              >
                {leadCount} lead{leadCount === 1 ? "" : "s"} sourced
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </Link>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="bg-error-container border border-error/30 text-on-error-container rounded-xl px-4 py-3 text-sm font-label flex items-start gap-2 mb-6">
          <span className="material-symbols-outlined text-[18px] mt-0.5">error</span>
          {error}
        </div>
      )}

      {/* Streaming reasoning */}
      <div className="bg-surface-container-low rounded-2xl editorial-shadow overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline/10">
          <div>
            <div className="eyebrow text-on-surface-variant/60 mb-0.5">Live</div>
            <div className="font-headline font-bold text-on-surface tracking-tight">
              Agent reasoning
            </div>
          </div>
          <div className="font-label text-[11px] text-on-surface-variant/70 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[14px]">bolt</span>
            Powered by{" "}
            <span className="font-bold text-on-surface">Vultr</span> ·{" "}
            <span className="font-bold text-on-surface">Anthropic Claude</span>
          </div>
        </div>
        <div className="p-5">
          <StreamingReasoningPanel
            runId={runId}
            verticalId={vertical?.id ?? null}
            defaultOpen={false}
          />
        </div>
      </div>

      {verifyOpen && (
        <CallerIDVerificationModal
          onClose={() => setVerifyOpen(false)}
          onVerified={() => setVerifyOpen(false)}
        />
      )}
    </AppShell>
  );
}

/* ────────────────────────── Atoms ────────────────────────── */

function Pill({ icon, children }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container-high text-on-surface font-label text-[11.5px] font-medium tracking-tight">
      <span className="material-symbols-outlined text-[13px] text-on-surface-variant">
        {icon}
      </span>
      {children}
    </span>
  );
}

function Spinner() {
  return (
    <svg
      className="w-4 h-4 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />
      <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

function StatusDot({ status }) {
  if (status === "complete") {
    return (
      <span className="w-2.5 h-2.5 rounded-full bg-tertiary shrink-0" aria-hidden="true" />
    );
  }
  if (status === "failed") {
    return (
      <span className="w-2.5 h-2.5 rounded-full bg-error shrink-0" aria-hidden="true" />
    );
  }
  if (status === "running" || status === "queued") {
    return (
      <span className="relative flex h-2.5 w-2.5 shrink-0">
        <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-75 animate-ping"></span>
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
      </span>
    );
  }
  return <span className="w-2.5 h-2.5 rounded-full bg-on-surface-variant/50 shrink-0" />;
}
