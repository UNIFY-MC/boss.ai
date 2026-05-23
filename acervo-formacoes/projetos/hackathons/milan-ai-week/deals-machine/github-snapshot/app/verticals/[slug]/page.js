"use client";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import AppShell from "../../components/AppShell";
import VerticalPlaybookCard from "../../components/VerticalPlaybookCard";
import VerticalBuilderWizard from "../../components/VerticalBuilderWizard";
import { useToast } from "../../components/Toast";
import { supabase } from "../../lib/supabase";
import { timeAgo } from "../../lib/format";
import { useRuns, useAgentLeads, useKnowledge } from "../../lib/hooks";

export default function VerticalDetailPage() {
  const params = useParams();
  const slug = params?.slug;
  const [vertical, setVertical] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase || !slug) {
      setLoading(false);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("verticals")
        .select("id, slug, display_name, config, active, created_at")
        .eq("slug", slug)
        .maybeSingle();
      setVertical(data);
      setLoading(false);
    })();
  }, [slug]);

  if (loading) {
    return (
      <AppShell>
        <div className="space-y-4">
          <div className="skeleton h-10 w-64" />
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-20" />
            ))}
          </div>
          <div className="skeleton h-64 w-full" />
        </div>
      </AppShell>
    );
  }

  if (!vertical) {
    return (
      <AppShell>
        <div className="bg-surface-container-low rounded-2xl editorial-shadow p-12 text-center max-w-md mx-auto">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-surface-container-high mb-3">
            <span className="material-symbols-outlined text-on-surface-variant text-[28px]">
              search_off
            </span>
          </div>
          <div className="font-headline font-bold text-on-surface mb-1">
            Vertical not found
          </div>
          <p className="font-label text-sm text-on-surface-variant mb-4">
            This vertical may have been archived or deleted.
          </p>
          <Link
            href="/verticals"
            className="font-label text-sm font-bold text-primary hover:underline"
          >
            ← Back to verticals
          </Link>
        </div>
      </AppShell>
    );
  }

  const cfg = vertical.config ?? {};
  return (
    <AppShell>
      <Header vertical={vertical} onUpdated={setVertical} />
      <PrimaryActionRow vertical={vertical} />
      <Stats verticalId={vertical.id} />

      <div className="mt-5 mb-5">
        <VerticalPlaybookCard vertical={vertical} onUpdated={setVertical} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mt-5">
        <div className="lg:col-span-8 space-y-5">
          <Card title="ICP" icon="my_location">
            <KV label="Titles" value={(cfg.icp?.titles ?? []).join(", ") || "—"} />
            <KV
              label="Company size"
              value={
                cfg.icp?.company_size_range
                  ? `${cfg.icp.company_size_range[0]}–${cfg.icp.company_size_range[1]} employees`
                  : "—"
              }
            />
            <KV label="Countries" value={(cfg.icp?.countries ?? []).join(", ") || "—"} />
            <KV label="ARR target" value={(cfg.icp?.revenue_range ?? []).join(", ") || "—"} />
            <KV label="Industries" value={(cfg.icp?.industries ?? []).join(", ") || "—"} />
            {(cfg.icp?.titles_exclude ?? []).length > 0 && (
              <KV label="Titles excluded" value={cfg.icp.titles_exclude.join(", ")} />
            )}
            {(cfg.icp?.company_exclusions ?? []).length > 0 && (
              <KV
                label="Domain exclusions"
                value={
                  <span className="font-mono text-[12px] text-on-surface-variant break-words">
                    {cfg.icp.company_exclusions.slice(0, 6).join(", ")}
                    {cfg.icp.company_exclusions.length > 6 ? ` +${cfg.icp.company_exclusions.length - 6} more` : ""}
                  </span>
                }
              />
            )}
          </Card>

          <Card title="Signal sources" icon="rss_feed">
            {(cfg.signal_source?.sources ?? []).length === 0 ? (
              <div className="font-label text-sm text-on-surface-variant py-2">
                No sources configured.
              </div>
            ) : (
              <ul className="divide-y divide-outline/10">
                {(cfg.signal_source?.sources ?? []).map((s, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="material-symbols-outlined text-on-surface-variant text-[16px]">
                        {sourceIcon(s.url, s.name)}
                      </span>
                      <span className="font-label text-sm text-on-surface truncate">
                        {s.name}
                      </span>
                    </div>
                    <span className="font-mono text-[11px] text-on-surface-variant truncate max-w-[55%]">
                      {s.url ? hostnameOf(s.url) : "—"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-3 pt-3 border-t border-outline/10 flex items-center gap-2 font-label text-[11px] text-on-surface-variant">
              <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
              Plus a live web search on every run — the agent picks queries from this ICP.
            </div>
            {cfg.signal_source?.relevance_prompt && (
              <div className="mt-4 p-3 bg-surface-container-lowest rounded-xl border border-outline/10">
                <div className="eyebrow text-on-surface-variant/70 mb-1">
                  Relevance criterion
                </div>
                <div className="font-label text-[13px] text-on-surface italic leading-relaxed">
                  &ldquo;{cfg.signal_source.relevance_prompt}&rdquo;
                </div>
              </div>
            )}
          </Card>

          <Card title="Voice" icon="record_voice_over">
            <KV label="Tone" value={cfg.script_voice?.tone || "—"} />
            {(cfg.script_voice?.anchor_phrases ?? []).length > 0 && (
              <KV
                label="Anchor phrases"
                value={
                  <ul className="space-y-1.5">
                    {cfg.script_voice.anchor_phrases.map((p, i) => (
                      <li
                        key={i}
                        className="font-label text-[13px] text-on-surface italic before:content-['“'] after:content-['”']"
                      >
                        {p}
                      </li>
                    ))}
                  </ul>
                }
              />
            )}
            {(cfg.script_voice?.forbidden_phrases ?? []).length > 0 && (
              <KV
                label="Never say"
                value={
                  <div className="flex flex-wrap gap-1.5">
                    {cfg.script_voice.forbidden_phrases.map((p, i) => (
                      <span
                        key={i}
                        className="font-label text-[11.5px] px-2 py-0.5 rounded-full bg-error-container text-on-error-container font-medium"
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                }
              />
            )}
            <KV label="Pricing policy" value={cfg.script_voice?.pricing_policy || "on_request"} />
          </Card>

          <Card title="Chain-builder persona" icon="psychology_alt">
            <p className="font-label text-[13px] text-on-surface leading-relaxed whitespace-pre-wrap">
              {cfg.chain_builder_persona || "—"}
            </p>
          </Card>
        </div>

        <aside className="lg:col-span-4">
          <RecentRunsSidebar verticalId={vertical.id} />
        </aside>
      </div>
    </AppShell>
  );
}

function Header({ vertical, onUpdated }) {
  const router = useRouter();
  const toast = useToast();
  const [refineOpen, setRefineOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const archive = async () => {
    if (!supabase || busy) return;
    if (!window.confirm(`Archive "${vertical.display_name}"? It'll be hidden from the dashboard and vertical list. You can unarchive from the settings page.`)) return;
    setBusy(true);
    const { error } = await supabase
      .from("verticals")
      .update({ active: false })
      .eq("id", vertical.id);
    setBusy(false);
    if (error) {
      toast.error("Archive failed", { detail: error.message });
      return;
    }
    toast.success("Vertical archived");
    router.push("/verticals");
  };

  const unarchive = async () => {
    if (!supabase || busy) return;
    setBusy(true);
    const { error } = await supabase
      .from("verticals")
      .update({ active: true })
      .eq("id", vertical.id);
    setBusy(false);
    if (error) {
      toast.error("Unarchive failed", { detail: error.message });
      return;
    }
    toast.success("Vertical unarchived");
    onUpdated?.({ ...vertical, active: true });
  };

  const hardDelete = async () => {
    if (!supabase || busy) return;
    const typed = window.prompt(
      `Permanently delete "${vertical.display_name}"?\n\nThis removes the vertical AND every run, lead, call, and brain entry attached to it. There is no undo.\n\nType the vertical name to confirm:`,
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
    router.push("/verticals");
  };

  return (
    <div className="mb-6">
      <Link
        href="/verticals"
        className="font-label text-xs text-on-surface-variant hover:text-on-surface mb-3 inline-flex items-center gap-1 transition-colors"
      >
        <span className="material-symbols-outlined text-[14px]">arrow_back</span>
        All verticals
      </Link>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="eyebrow text-on-surface-variant/70 mb-1">Vertical</div>
          <EditableTitle vertical={vertical} onUpdated={onUpdated} />
          <div className="flex items-center gap-3 mt-2">
            {vertical.active ? (
              <span className="font-label text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-tertiary-container text-on-tertiary-container font-bold">
                Active
              </span>
            ) : (
              <span className="font-label text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant font-bold">
                Archived
              </span>
            )}
            {vertical.created_at && (
              <span className="font-label text-[12px] text-on-surface-variant">
                Built {timeAgo(vertical.created_at)}
              </span>
            )}
          </div>
        </div>

        {/* Action buttons — refine + archive/unarchive + delete */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setRefineOpen(true)}
            disabled={busy}
            className="px-4 py-2.5 rounded-xl font-label text-sm font-semibold border border-outline/25 bg-surface-container-lowest text-on-surface hover:bg-surface-container-high hover:-translate-y-px transition-all disabled:opacity-50 inline-flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[18px]">auto_fix_high</span>
            Refine
          </button>
          {vertical.active ? (
            <button
              onClick={archive}
              disabled={busy}
              className="px-4 py-2.5 rounded-xl font-label text-sm font-semibold border border-outline/25 bg-surface-container-lowest text-on-surface hover:bg-surface-container-high transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[18px]">inventory_2</span>
              Archive
            </button>
          ) : (
            <button
              onClick={unarchive}
              disabled={busy}
              className="px-4 py-2.5 rounded-xl font-label text-sm font-semibold border border-outline/25 bg-surface-container-lowest text-on-surface hover:bg-surface-container-high transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[18px]">unarchive</span>
              Unarchive
            </button>
          )}
          <button
            onClick={hardDelete}
            disabled={busy}
            className="px-3.5 py-2.5 rounded-xl font-label text-sm font-medium text-on-surface-variant hover:bg-error-container hover:text-on-error-container transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
            title="Permanently delete this vertical and all its data"
          >
            <span className="material-symbols-outlined text-[18px]">delete</span>
            Delete
          </button>
        </div>
      </div>

      {refineOpen && (
        <VerticalBuilderWizard
          existingVertical={vertical}
          onClose={() => setRefineOpen(false)}
          onSaved={(saved) => {
            setRefineOpen(false);
            toast.success("Vertical refined", { detail: saved?.display_name });
            // Reload current page with the new data — saved.slug may differ
            // (it doesn't, we preserve it server-side) but reload anyway.
            if (saved?.slug && saved.slug !== vertical.slug) {
              router.push(`/verticals/${saved.slug}`);
            } else {
              router.refresh();
            }
          }}
        />
      )}
    </div>
  );
}

function PrimaryActionRow({ vertical }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
      <Link
        href={`/intelligence?vertical=${vertical.slug}&autorun=1`}
        className="metallic-silk gleam-hover text-on-primary px-5 py-3.5 rounded-2xl font-headline font-bold text-sm shadow-lg hover:-translate-y-px hover:shadow-xl transition-all inline-flex items-center justify-center gap-2"
      >
        <span className="material-symbols-outlined text-[20px]">auto_awesome</span>
        Run the agent
      </Link>
      <Link
        href={`/leads?vertical=${vertical.slug}`}
        className="bg-surface-container-lowest border border-outline/20 text-on-surface px-5 py-3.5 rounded-2xl font-headline font-bold text-sm editorial-shadow-sm hover:bg-surface-container-high hover:-translate-y-px transition-all inline-flex items-center justify-center gap-2"
      >
        <span className="material-symbols-outlined text-[18px]">groups</span>
        View leads
      </Link>
      <Link
        href={`/knowledge?vertical=${vertical.slug}`}
        className="bg-surface-container-lowest border border-outline/20 text-on-surface px-5 py-3.5 rounded-2xl font-headline font-bold text-sm editorial-shadow-sm hover:bg-surface-container-high hover:-translate-y-px transition-all inline-flex items-center justify-center gap-2"
      >
        <span className="material-symbols-outlined text-[18px]">psychology</span>
        View knowledge
      </Link>
    </div>
  );
}

function Stats({ verticalId }) {
  const { runs } = useRuns({ verticalId, limit: 100 });
  const { leads } = useAgentLeads({ verticalId, limit: 500 });
  const { entries } = useKnowledge({ verticalId, limit: 500 });

  return (
    <div className="grid grid-cols-3 gap-3">
      <Stat icon="bolt" label="Total runs" value={runs.length} />
      <Stat icon="groups" label="Leads sourced" value={leads.length} />
      <Stat icon="psychology" label="Brain entries" value={entries.length} />
    </div>
  );
}

function Stat({ icon, label, value }) {
  return (
    <div className="bg-surface-container-low rounded-2xl p-4 editorial-shadow">
      <div className="flex items-center gap-2 mb-2">
        <span className="material-symbols-outlined text-on-surface-variant text-[18px]">
          {icon}
        </span>
        <span className="eyebrow text-on-surface-variant">{label}</span>
      </div>
      <p className="font-headline font-extrabold text-2xl text-on-surface tabular-nums tracking-tight">
        {value}
      </p>
    </div>
  );
}

function Card({ title, icon, children }) {
  return (
    <div className="bg-surface-container-low rounded-2xl p-5 editorial-shadow">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-outline/10">
        <span className="material-symbols-outlined text-on-surface-variant text-[18px]">
          {icon}
        </span>
        <span className="eyebrow text-on-surface-variant">{title}</span>
      </div>
      <div>{children}</div>
    </div>
  );
}

function KV({ label, value }) {
  return (
    <div className="flex gap-3 py-2 border-b border-outline/10 last:border-0 last:pb-0 first:pt-0 font-label text-[13px]">
      <div className="text-on-surface-variant/80 w-36 flex-shrink-0 uppercase tracking-wider text-[10px] font-bold pt-1">
        {label}
      </div>
      <div className="text-on-surface flex-1 leading-relaxed">{value}</div>
    </div>
  );
}

function RecentRunsSidebar({ verticalId }) {
  const { runs, loading } = useRuns({ verticalId, limit: 5 });
  if (loading) {
    return <div className="skeleton h-32 w-full rounded-2xl" />;
  }
  if (runs.length === 0) {
    return (
      <div className="bg-surface-container-low rounded-2xl p-4 editorial-shadow text-center">
        <div className="eyebrow text-on-surface-variant mb-2">Recent runs</div>
        <p className="font-label text-xs text-on-surface-variant">
          No runs yet. Click Run the agent above to source your first leads.
        </p>
      </div>
    );
  }
  return (
    <div className="bg-surface-container-low rounded-2xl p-4 editorial-shadow">
      <div className="eyebrow text-on-surface-variant mb-3">Recent runs</div>
      <ul className="space-y-2.5">
        {runs.map((r) => (
          <li key={r.id} className="font-label text-xs">
            <div className="flex items-center gap-2">
              <StatusDot status={r.status} />
              <span className="text-on-surface truncate flex-1 font-medium">
                {r.summary ? r.summary.slice(0, 60) : r.status}
              </span>
            </div>
            <div className="text-on-surface-variant ml-3.5 mt-0.5 text-[10.5px]">
              {timeAgo(r.created_at)} · {r.triggered_by || "manual"}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function StatusDot({ status }) {
  const c =
    status === "complete"
      ? "bg-tertiary"
      : status === "failed"
        ? "bg-error"
        : status === "running"
          ? "bg-primary animate-pulse"
          : "bg-on-surface-variant/50";
  return <span className={`w-2 h-2 rounded-full shrink-0 ${c}`} />;
}

function hostnameOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function sourceIcon(url, name) {
  if (!url) return "rss_feed";
  const lower = url.toLowerCase();
  if (lower.includes("reddit.com")) return "forum";
  if (lower.includes("hacker-news") || (name || "").toLowerCase().includes("hacker news"))
    return "code";
  return "rss_feed";
}

// Inline-editable vertical title. Click to edit, Enter to save, Escape to cancel.
// Slug stays fixed (it's the URL); only display_name changes.
function EditableTitle({ vertical, onUpdated }) {
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(vertical.display_name || "");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const cancel = () => {
    setValue(vertical.display_name || "");
    setEditing(false);
  };

  const save = async () => {
    const next = value.trim();
    if (!next || next === vertical.display_name) {
      cancel();
      return;
    }
    if (!supabase) {
      toast.error("Supabase not configured");
      cancel();
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("verticals")
      .update({ display_name: next })
      .eq("id", vertical.id);
    setSaving(false);
    if (error) {
      toast.error("Rename failed", { detail: error.message });
      return;
    }
    toast.success("Renamed");
    onUpdated?.({ ...vertical, display_name: next });
    setEditing(false);
  };

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="group inline-flex items-center gap-2 text-left -ml-1 px-1 rounded-lg hover:bg-surface-container-high transition-colors"
        title="Click to rename"
      >
        <h1 className="display-1 text-on-surface" style={{ fontSize: "2.25rem" }}>
          {vertical.display_name}
        </h1>
        <span className="material-symbols-outlined text-on-surface-variant text-[20px] opacity-0 group-hover:opacity-100 transition-opacity">
          edit
        </span>
      </button>
    );
  }

  return (
    <div className="inline-flex items-center gap-2">
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            save();
          } else if (e.key === "Escape") {
            e.preventDefault();
            cancel();
          }
        }}
        disabled={saving}
        className="display-1 text-on-surface bg-surface-container-lowest border border-outline/30 rounded-lg px-2 py-0.5 focus:outline-none focus:border-on-surface/60"
        style={{ fontSize: "2.25rem", minWidth: "20ch" }}
      />
      {saving && (
        <span className="material-symbols-outlined text-on-surface-variant text-[20px] animate-spin">
          progress_activity
        </span>
      )}
    </div>
  );
}

