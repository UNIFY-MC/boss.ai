"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import AppShell from "../components/AppShell";
import VerticalBuilderWizard from "../components/VerticalBuilderWizard";
import { useToast } from "../components/Toast";
import { supabase } from "../lib/supabase";
import { useVerticals, useRuns, useAgentLeads, useKnowledge } from "../lib/hooks";

export default function VerticalsPage() {
  return (
    <Suspense
      fallback={
        <AppShell>
          <div className="text-on-surface-variant text-sm py-12 text-center">Loading…</div>
        </AppShell>
      }
    >
      <VerticalsPageInner />
    </Suspense>
  );
}

function VerticalsPageInner() {
  const search = useSearchParams();
  const router = useRouter();
  const { verticals, loading, refresh } = useVerticals();
  const [builderOpen, setBuilderOpen] = useState(false);

  useEffect(() => {
    if (search?.get("new") === "1") setBuilderOpen(true);
  }, [search]);

  const handleClose = () => {
    setBuilderOpen(false);
    if (search?.get("new")) router.replace("/verticals");
  };
  const handleSaved = (saved) => {
    setBuilderOpen(false);
    refresh();
    if (saved?.slug) router.push(`/verticals/${saved.slug}`);
  };

  return (
    <AppShell>
      <div className="mb-6 flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="eyebrow text-on-surface-variant/70 mb-1">Configure</div>
          <h1 className="display-1 text-on-surface" style={{ fontSize: "2.25rem" }}>
            Verticals
          </h1>
          <p className="font-label text-sm text-on-surface-variant mt-1 max-w-2xl">
            A vertical is the agent's job description — ICP, where to look for buying signals, and how to talk when it lands a contact.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
          <Link
            href="/onboarding"
            className="px-4 py-3 rounded-2xl font-headline font-semibold text-sm border border-outline/25 bg-surface-container-lowest text-on-surface hover:bg-surface-container-high hover:-translate-y-px transition-all flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
            Guided ICP
          </Link>
          <button
            onClick={() => setBuilderOpen(true)}
            className="metallic-silk text-on-primary px-5 py-3 rounded-2xl font-headline font-bold text-sm shadow-lg hover:-translate-y-px hover:shadow-xl transition-all flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[20px]">add_circle</span>
            Build new vertical
          </button>
        </div>
      </div>

      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-52 w-full rounded-2xl" />
          ))}
        </div>
      )}

      {!loading && verticals.length === 0 && <EmptyState onBuild={() => setBuilderOpen(true)} />}

      {!loading && verticals.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {verticals.map((v) => (
            <VerticalCard key={v.id} vertical={v} onChanged={refresh} />
          ))}
        </div>
      )}

      {builderOpen && (
        <VerticalBuilderWizard onClose={handleClose} onSaved={handleSaved} />
      )}
    </AppShell>
  );
}

function VerticalCard({ vertical, onChanged }) {
  const { runs } = useRuns({ verticalId: vertical.id, limit: 1 });
  const { leads } = useAgentLeads({ verticalId: vertical.id, limit: 500 });
  const { entries } = useKnowledge({ verticalId: vertical.id, limit: 500 });
  const lastRun = runs[0];
  const icp = vertical.config?.icp ?? {};
  const sources = vertical.config?.signal_source?.sources ?? [];
  const toast = useToast();
  const router = useRouter();
  const [refineOpen, setRefineOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const stopAndDo = (e, fn) => {
    e.preventDefault();
    e.stopPropagation();
    fn();
  };

  const submitRename = async (nextName) => {
    if (!supabase) return;
    const trimmed = nextName.trim();
    if (!trimmed || trimmed === vertical.display_name) {
      setRenameOpen(false);
      return;
    }
    setBusy(true);
    const { error } = await supabase
      .from("verticals")
      .update({ display_name: trimmed })
      .eq("id", vertical.id);
    setBusy(false);
    if (error) {
      toast.error("Rename failed", { detail: error.message });
      return;
    }
    setRenameOpen(false);
    toast.success("Renamed", { detail: trimmed });
    onChanged?.();
  };

  const toggleArchive = async () => {
    if (!supabase || busy) return;
    const goingToArchive = vertical.active !== false;
    if (goingToArchive && !window.confirm(`Archive "${vertical.display_name}"?`)) return;
    setBusy(true);
    const { error } = await supabase
      .from("verticals")
      .update({ active: !goingToArchive })
      .eq("id", vertical.id);
    setBusy(false);
    if (error) {
      toast.error(goingToArchive ? "Archive failed" : "Unarchive failed", { detail: error.message });
      return;
    }
    toast.success(goingToArchive ? "Vertical archived" : "Vertical unarchived");
    onChanged?.();
  };

  const hardDelete = async () => {
    if (!supabase || busy) return;
    const typed = window.prompt(
      `Permanently delete "${vertical.display_name}"?\n\nThis removes the vertical and every run, lead, call, and brain entry attached to it. There is no undo.\n\nType the vertical name to confirm:`,
    );
    if (!typed || typed.trim() !== vertical.display_name) {
      if (typed !== null) toast.info("Delete cancelled — name didn't match");
      return;
    }
    setBusy(true);
    const { error } = await supabase
      .from("verticals")
      .delete()
      .eq("id", vertical.id);
    setBusy(false);
    if (error) {
      toast.error("Delete failed", { detail: error.message });
      return;
    }
    toast.success("Vertical deleted permanently");
    onChanged?.();
  };

  return (
    <>
    <Link
      href={`/verticals/${vertical.slug}`}
      className="group relative block bg-surface-container-low rounded-2xl p-5 editorial-shadow card-interactive overflow-hidden"
    >
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-primary-fixed to-primary opacity-90"></div>

      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <div className="font-headline font-extrabold text-on-surface text-lg leading-tight tracking-tight">
            {vertical.display_name}
          </div>
          {vertical.short_summary && (
            <div className="font-label text-[12.5px] text-on-surface-variant mt-1 line-clamp-2 leading-snug">
              {vertical.short_summary}
            </div>
          )}
        </div>
        {!vertical.active && (
          <span className="font-label text-[9.5px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant flex-shrink-0 font-bold">
            Archived
          </span>
        )}
      </div>

      {/* Single 3-dot menu in the top-right. Always visible but low-key;
          click opens a vertical dropdown with refine/archive/delete.
          Clicks stop-propagated so they don't follow the parent Link. */}
      <CardMenu
        busy={busy}
        active={vertical.active !== false}
        onRename={() => setRenameOpen(true)}
        onRefine={() => setRefineOpen(true)}
        onArchive={toggleArchive}
        onDelete={hardDelete}
        stopAndDo={stopAndDo}
      />

      <div className="space-y-2 mb-5 min-h-[5rem]">
        <Row label="Titles" value={(icp.titles ?? []).slice(0, 3).join(" · ") || "—"} />
        <Row
          label="Size"
          value={icp.company_size_range ? `${icp.company_size_range[0]}–${icp.company_size_range[1]} employees` : "—"}
        />
        <Row label="Geo" value={(icp.countries ?? []).slice(0, 3).join(", ") || "—"} />
        <Row
          label="ARR"
          value={(icp.revenue_range ?? []).join(", ") || "—"}
        />
      </div>

      <div className="grid grid-cols-4 gap-2 pt-4 border-t border-outline/10">
        <Stat icon="bolt" value={runs.length === 0 ? "—" : runs.length} label="runs" />
        <Stat icon="groups" value={leads.length} label="leads" />
        <Stat icon="psychology" value={entries.length} label="brain" />
        <Stat icon="rss_feed" value={sources.length} label="sources" />
      </div>

      {lastRun && (
        <div className="font-label text-[11px] text-on-surface-variant mt-3 pt-3 border-t border-outline/10 flex items-center gap-1.5">
          <StatusMicroDot status={lastRun.status} />
          Last run · <span className="text-on-surface font-medium">{lastRun.status}</span> · {timeAgo(lastRun.created_at)}
        </div>
      )}

    </Link>

    {refineOpen && (
      <VerticalBuilderWizard
        existingVertical={vertical}
        onClose={() => setRefineOpen(false)}
        onSaved={(saved) => {
          setRefineOpen(false);
          toast.success("Vertical refined", { detail: saved?.display_name });
          onChanged?.();
        }}
      />
    )}

    {renameOpen && (
      <RenameVerticalModal
        current={vertical.display_name || ""}
        busy={busy}
        onClose={() => setRenameOpen(false)}
        onSubmit={submitRename}
      />
    )}
    </>
  );
}

function CardMenu({ busy, active, onRename, onRefine, onArchive, onDelete, stopAndDo }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const pick = (e, fn) => {
    setOpen(false);
    stopAndDo(e, fn);
  };

  return (
    <div ref={wrapRef} className="absolute right-3 top-3 z-20">
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        disabled={busy}
        aria-label="Actions"
        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors disabled:opacity-50 ${
          open
            ? "bg-surface-container-high text-on-surface"
            : "text-on-surface-variant/70 hover:bg-surface-container-high hover:text-on-surface"
        }`}
      >
        <span className="material-symbols-outlined text-[20px]">more_vert</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-48 rounded-xl bg-surface-container-lowest editorial-shadow-lg border border-outline/10 py-1.5 animate-scale-in origin-top-right">
          <MenuItem
            icon="edit"
            label="Rename"
            onClick={(e) => pick(e, onRename)}
          />
          <MenuItem
            icon="auto_fix_high"
            label="Refine"
            onClick={(e) => pick(e, onRefine)}
          />
          <MenuItem
            icon={active ? "inventory_2" : "unarchive"}
            label={active ? "Archive" : "Unarchive"}
            onClick={(e) => pick(e, onArchive)}
          />
          <div className="my-1 border-t border-outline/10" />
          <MenuItem
            icon="delete"
            label="Delete permanently"
            onClick={(e) => pick(e, onDelete)}
            danger
          />
        </div>
      )}
    </div>
  );
}

function MenuItem({ icon, label, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2 flex items-center gap-2.5 font-label text-[13px] font-medium transition-colors ${
        danger
          ? "text-on-surface hover:bg-error-container hover:text-on-error-container"
          : "text-on-surface hover:bg-surface-container"
      }`}
    >
      <span className="material-symbols-outlined text-[16px] shrink-0">{icon}</span>
      <span className="truncate">{label}</span>
    </button>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex gap-2 font-label text-[12px]">
      <span className="text-on-surface-variant/70 min-w-[42px] uppercase tracking-wider text-[10px] font-bold pt-[2px]">
        {label}
      </span>
      <span className="text-on-surface truncate flex-1 leading-snug">{value}</span>
    </div>
  );
}

function Stat({ icon, value, label }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="material-symbols-outlined text-on-surface-variant text-[16px]">
        {icon}
      </span>
      <div className="leading-none">
        <div className="font-headline font-bold text-sm text-on-surface tabular-nums">{value}</div>
        <div className="font-label text-[9.5px] uppercase tracking-wider text-on-surface-variant mt-0.5">
          {label}
        </div>
      </div>
    </div>
  );
}

function StatusMicroDot({ status }) {
  const c =
    status === "complete"
      ? "bg-tertiary"
      : status === "failed"
        ? "bg-error"
        : status === "running"
          ? "bg-primary animate-pulse"
          : "bg-on-surface-variant/50";
  return <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${c}`} />;
}

function EmptyState({ onBuild }) {
  return (
    <div className="bg-surface-container-low rounded-2xl p-12 text-center editorial-shadow">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-surface-container-high mb-4">
        <span
          className="material-symbols-outlined text-on-surface-variant text-[32px]"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          track_changes
        </span>
      </div>
      <div className="font-headline font-extrabold text-xl text-on-surface mb-2 tracking-tight">
        No verticals yet
      </div>
      <p className="font-label text-sm text-on-surface-variant mb-6 max-w-md mx-auto leading-relaxed">
        A vertical is the agent's job description — who it's targeting, where to source
        leads, how to talk to them.
      </p>
      <div className="flex items-center justify-center gap-2 flex-wrap">
        <Link
          href="/onboarding"
          className="metallic-silk text-on-primary px-6 py-3 rounded-2xl font-headline font-bold text-sm shadow-lg hover:-translate-y-px hover:shadow-xl transition-all inline-flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-[20px]">auto_awesome</span>
          Not sure who to sell to? Start here
        </Link>
        <button
          onClick={onBuild}
          className="px-5 py-3 rounded-2xl font-headline font-semibold text-sm border border-outline/25 bg-surface-container-lowest text-on-surface hover:bg-surface-container-high hover:-translate-y-px transition-all inline-flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-[20px]">add_circle</span>
          I know my ICP — build it manually
        </button>
      </div>
    </div>
  );
}

function RenameVerticalModal({ current, busy, onClose, onSubmit }) {
  const [value, setValue] = useState(current);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.select();
  }, []);

  const submit = (e) => {
    e?.preventDefault?.();
    if (!value.trim() || busy) return;
    onSubmit(value);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in"
      onClick={busy ? undefined : onClose}
    >
      <div className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm" />
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="glass-panel relative w-full max-w-md rounded-3xl editorial-shadow-lg animate-scale-in"
      >
        <div className="px-6 pt-5 pb-4 border-b border-outline/10 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="eyebrow text-on-surface-variant mb-1">Vertical</div>
            <div className="font-headline text-lg font-bold text-on-surface tracking-tight">
              Rename vertical
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="shrink-0 w-9 h-9 rounded-full hover:bg-surface-container-high flex items-center justify-center transition-colors disabled:opacity-50"
            aria-label="Close"
          >
            <span className="material-symbols-outlined text-on-surface-variant text-[20px]">close</span>
          </button>
        </div>

        <div className="p-6">
          <label className="eyebrow text-on-surface-variant mb-2 block">New name</label>
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                onClose();
              }
            }}
            disabled={busy}
            className="w-full px-4 py-2.5 rounded-xl border border-outline/15 bg-surface-container-lowest focus:outline-none focus:border-on-surface/40 font-label text-[14px]"
            placeholder="Vertical name"
          />
          <div className="font-label text-[11.5px] text-on-surface-variant/80 mt-2">
            This changes the display name only — the slug (URL) stays the same.
          </div>

          <div className="flex items-center justify-end gap-2 mt-5 pt-4 border-t border-outline/10">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="px-4 py-2.5 rounded-xl font-headline font-semibold text-sm text-on-surface-variant hover:bg-surface-container transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy || !value.trim() || value.trim() === current}
              className="metallic-silk gleam-hover text-on-primary px-5 py-2.5 rounded-xl font-headline font-bold text-sm shadow-lg disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-px transition-all inline-flex items-center gap-2"
            >
              {busy ? (
                <>
                  <span className="material-symbols-outlined text-[18px] animate-spin">
                    progress_activity
                  </span>
                  Saving…
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">save</span>
                  Save
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function timeAgo(ts) {
  if (!ts) return "";
  const sec = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}
