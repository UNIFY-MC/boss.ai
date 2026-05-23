"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import AppShell from "./components/AppShell";
import CountUp from "./components/CountUp";
import EmptyState from "./components/EmptyState";
import { supabase } from "./lib/supabase";
import { timeAgo } from "./lib/format";
import {
  useDashboardStats,
  useActiveRuns,
  useRuns,
  useVerticals,
} from "./lib/hooks";

/* ───────────────────────── Page ───────────────────────── */

export default function DashboardPage() {
  const { stats, loading: statsLoading } = useDashboardStats();
  const { runs: activeRuns } = useActiveRuns();

  return (
    <AppShell>
      <Hero activeCount={activeRuns.length} />

      <ActiveRunsWidget runs={activeRuns} />

      <StatGrid stats={stats} loading={statsLoading} />

      <QuickActions />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 mb-6">
        <div className="lg:col-span-3">
          <RecentRuns />
        </div>
        <div className="lg:col-span-2">
          <VerticalsSnapshot />
        </div>
      </div>

      <LatestInsights />
    </AppShell>
  );
}

/* ───────────────────────── Hero ───────────────────────── */

function Hero({ activeCount }) {
  // All three time-derived strings live in client state to avoid SSR
  // hydration mismatches (server runs in UTC, client in local timezone).
  const [time, setTime] = useState("");
  const [dateLabel, setDateLabel] = useState("");
  const [greeting, setGreeting] = useState("");
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString(undefined, {
          hour: "numeric",
          minute: "2-digit",
        })
      );
      setDateLabel(
        now.toLocaleDateString(undefined, {
          weekday: "long",
          month: "long",
          day: "numeric",
        })
      );
      setGreeting(greetingFor(now));
    };
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="mb-8 flex items-end justify-between gap-6 flex-wrap">
      <div className="min-w-0">
        <div className="eyebrow text-on-surface-variant/70 mb-2 min-h-[1em]">
          {dateLabel}
        </div>
        <h1 className="display-1 text-on-surface">
          {greeting ? `Good ${greeting}, Kyle` : "Hello, Kyle"}
        </h1>
        <p className="font-label text-base text-on-surface-variant mt-2 max-w-xl">
          {activeCount > 0
            ? `Your agent is working in the background — ${activeCount} run${activeCount === 1 ? "" : "s"} live.`
            : "Spin up an agent run, work the queue, watch the brain learn."}
        </p>
      </div>
      {time && (
        <div className="text-right">
          <div className="eyebrow text-on-surface-variant/60 mb-1">Local</div>
          <div className="font-headline font-bold text-2xl tabular-nums text-on-surface tracking-tight">
            {time}
          </div>
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── Active runs ───────────────────────── */

function ActiveRunsWidget({ runs }) {
  if (!runs || runs.length === 0) return null;
  return (
    <div className="mb-6 rounded-2xl overflow-hidden editorial-shadow">
      <div className="accent-live px-5 py-3 flex items-center gap-2">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full rounded-full bg-white opacity-75 animate-ping"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
        </span>
        <span className="eyebrow text-white">
          {runs.length} agent {runs.length === 1 ? "run" : "runs"} live now
        </span>
      </div>
      <div className="bg-surface-container-low divide-y divide-outline/10">
        {runs.map((r) => (
          <Link
            key={r.id}
            href="/intelligence"
            className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-surface-container transition-colors"
          >
            <div className="min-w-0">
              <div className="font-label text-sm text-on-surface font-medium truncate">
                {r.summary || "Run in progress…"}
              </div>
              <div className="font-label text-[11px] text-on-surface-variant mt-0.5">
                Started {timeAgo(r.started_at)} · triggered{" "}
                {r.triggered_by || "manually"}
              </div>
            </div>
            <span className="material-symbols-outlined text-on-surface-variant text-[18px]">
              arrow_forward
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ───────────────────────── Stat grid ───────────────────────── */

function StatGrid({ stats, loading }) {
  const items = [
    { icon: "track_changes", label: "Verticals", value: stats?.verticals ?? 0, href: "/verticals" },
    { icon: "bolt", label: "Runs today", value: stats?.runsToday ?? 0, href: "/intelligence" },
    { icon: "groups", label: "Leads sourced", value: stats?.leadsTotal ?? 0, href: "/leads" },
    { icon: "call", label: "Calls made", value: stats?.callsTotal ?? 0, href: "/leads" },
    { icon: "psychology", label: "Brain entries", value: stats?.knowledgeEntries ?? 0, href: "/knowledge" },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
      {items.map((it) => (
        <StatCard key={it.label} {...it} loading={loading} />
      ))}
    </div>
  );
}

function StatCard({ icon, label, value, href, loading }) {
  const body = (
    <div className="relative h-full bg-surface-container-low rounded-2xl p-4 editorial-shadow card-interactive overflow-hidden">
      <div className="flex items-center gap-2 mb-2">
        <span className="material-symbols-outlined text-on-surface-variant text-[18px]">
          {icon}
        </span>
        <span className="eyebrow text-on-surface-variant truncate">{label}</span>
      </div>
      {loading ? (
        <div className="skeleton h-9 w-20" />
      ) : (
        <CountUp
          value={value}
          className="font-headline font-extrabold text-3xl tabular-nums text-on-surface tracking-tight block"
        />
      )}
      <span className="absolute right-3 bottom-3 text-on-surface-variant/30 material-symbols-outlined text-[18px] opacity-0 group-hover:opacity-100 transition-opacity">
        arrow_forward
      </span>
    </div>
  );
  return href ? (
    <Link href={href} className="block group">
      {body}
    </Link>
  ) : (
    body
  );
}

/* ───────────────────────── Quick actions ───────────────────────── */

function QuickActions() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
      <QuickAction
        icon="add_circle"
        title="Build a new vertical"
        desc="Define your ICP, signals, voice — agent does the rest"
        href="/verticals?new=1"
        primary
      />
      <QuickAction
        icon="auto_awesome"
        title="Run the agent"
        desc="Source today's leads from your verticals"
        href="/intelligence"
      />
      <QuickAction
        icon="call"
        title="Work the queue"
        desc="Call, tag, push wins to your CRM"
        href="/leads"
      />
    </div>
  );
}

function QuickAction({ icon, title, desc, href, primary }) {
  return (
    <Link
      href={href}
      className={`group block p-5 rounded-2xl transition-all duration-200 ${
        primary
          ? "metallic-silk text-on-primary editorial-shadow-lg hover:-translate-y-0.5"
          : "bg-surface-container-low editorial-shadow card-interactive"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
            primary
              ? "bg-white/15 text-on-primary"
              : "bg-surface-container-high text-on-surface"
          }`}
        >
          <span className="material-symbols-outlined text-[22px]">{icon}</span>
        </div>
        <div className="min-w-0">
          <div
            className={`font-headline font-bold text-base tracking-tight ${
              primary ? "text-on-primary" : "text-on-surface"
            }`}
          >
            {title}
          </div>
          <div
            className={`font-label text-[13px] mt-1 leading-snug ${
              primary ? "text-on-primary/80" : "text-on-surface-variant"
            }`}
          >
            {desc}
          </div>
        </div>
        <span
          className={`ml-auto material-symbols-outlined text-[18px] transition-transform group-hover:translate-x-0.5 ${
            primary ? "text-on-primary/80" : "text-on-surface-variant/50"
          }`}
        >
          arrow_forward
        </span>
      </div>
    </Link>
  );
}

/* ───────────────────────── Recent runs ───────────────────────── */

function RecentRuns() {
  const { runs, loading } = useRuns({ limit: 6 });
  return (
    <div className="bg-surface-container-low rounded-2xl editorial-shadow h-full overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-outline/10">
        <div>
          <div className="eyebrow text-on-surface-variant/60 mb-0.5">
            Recent
          </div>
          <div className="font-headline font-bold text-on-surface">
            Agent runs
          </div>
        </div>
        <Link
          href="/settings"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-headline text-[13px] font-bold text-on-surface bg-surface-container-lowest border border-outline/15 hover:bg-surface-container-high hover:border-outline/30 hover:-translate-y-px transition-all shrink-0"
        >
          View all →
        </Link>
      </div>
      {loading ? (
        <div className="p-5 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-12 w-full" />
          ))}
        </div>
      ) : runs.length === 0 ? (
        <EmptyMicro
          icon="bolt"
          title="No runs yet"
          desc="Pick a vertical and run the agent to source your first leads."
          ctaLabel="Run the agent →"
          ctaHref="/intelligence"
        />
      ) : (
        <div className="divide-y divide-outline/10">
          {runs.map((r) => (
            <div
              key={r.id}
              className="flex items-center gap-3 px-5 py-3.5 hover:bg-surface-container/30 transition-colors"
            >
              <StatusDot status={r.status} />
              <div className="flex-1 min-w-0">
                <div className="font-label text-sm text-on-surface truncate">
                  {r.summary || "(no summary yet)"}
                </div>
                <div className="font-label text-[11px] text-on-surface-variant mt-0.5">
                  {timeAgo(r.created_at)} · {r.triggered_by || "manual"}
                </div>
              </div>
              <span
                className={`font-label text-[10px] uppercase tracking-wider px-2 py-1 rounded-full font-bold ${statusBadge(r.status)}`}
              >
                {r.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── Verticals snapshot ───────────────────────── */

function VerticalsSnapshot() {
  const { verticals, loading } = useVerticals();
  return (
    <div className="bg-surface-container-low rounded-2xl editorial-shadow h-full overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-outline/10">
        <div>
          <div className="eyebrow text-on-surface-variant/60 mb-0.5">
            Active
          </div>
          <div className="font-headline font-bold text-on-surface">
            Your verticals
          </div>
        </div>
        <Link
          href="/verticals"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-headline text-[13px] font-bold text-on-surface bg-surface-container-lowest border border-outline/15 hover:bg-surface-container-high hover:border-outline/30 hover:-translate-y-px transition-all shrink-0"
        >
          Manage →
        </Link>
      </div>
      {loading ? (
        <div className="p-5 space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-14 w-full" />
          ))}
        </div>
      ) : verticals.length === 0 ? (
        <EmptyMicro
          icon="track_changes"
          title="No verticals yet"
          desc="A vertical is the agent's job description — who to target, where to look, how to talk."
          ctaLabel="Build your first →"
          ctaHref="/verticals?new=1"
        />
      ) : (
        <div className="divide-y divide-outline/10 max-h-[420px] overflow-y-auto">
          {[...verticals]
            .sort((a, b) =>
              (a.display_name || "").localeCompare(b.display_name || "")
            )
            .map((v) => (
            <Link
              key={v.id}
              href={`/verticals/${v.slug}`}
              className="flex items-center gap-3 px-5 py-3.5 hover:bg-surface-container/30 transition-colors"
            >
              <div className="shrink-0 w-9 h-9 rounded-lg bg-surface-container-high text-on-surface flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">
                  track_changes
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-headline font-semibold text-sm text-on-surface truncate">
                  {v.display_name}
                </div>
                <div className="font-label text-[11px] text-on-surface-variant truncate mt-0.5">
                  {v.config?.icp?.titles?.slice(0, 2).join(", ") || "—"}
                </div>
              </div>
              <span className="material-symbols-outlined text-on-surface-variant/40 text-[18px]">
                chevron_right
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── Latest insights ───────────────────────── */

function LatestInsights() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    if (!supabase) {
      setLoading(false);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("brain_entries")
        .select("id, type, content, source, created_at, vertical_id")
        .order("created_at", { ascending: false })
        .limit(3);
      if (!alive) return;
      setEntries(data || []);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (loading) return null;
  if (entries.length === 0) return null;

  return (
    <div className="bg-surface-container-low rounded-2xl editorial-shadow overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-outline/10">
        <div>
          <div className="eyebrow text-on-surface-variant/60 mb-0.5">
            Just learned
          </div>
          <div className="font-headline font-bold text-on-surface">
            Latest insights
          </div>
        </div>
        <Link
          href="/knowledge"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-headline text-[13px] font-bold text-on-surface bg-surface-container-lowest border border-outline/15 hover:bg-surface-container-high hover:border-outline/30 hover:-translate-y-px transition-all shrink-0"
        >
          Open the brain →
        </Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-outline/10">
        {entries.map((e) => (
          <div key={e.id} className="px-5 py-4">
            <div className="eyebrow text-on-surface-variant/70 mb-1.5 flex items-center gap-1.5">
              <span
                className="material-symbols-outlined text-[14px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                {ICON_FOR_TYPE[e.type] || "psychology"}
              </span>
              {(e.type || "insight").replace(/_/g, " ")}
            </div>
            <div className="font-label text-sm text-on-surface leading-snug line-clamp-3">
              {e.content}
            </div>
            <div className="font-label text-[11px] text-on-surface-variant mt-2">
              {e.source || "agent"} · {timeAgo(e.created_at)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const ICON_FOR_TYPE = {
  angle_landed: "trending_up",
  angle_failed: "trending_down",
  objection_recurring: "report",
  commitment_made: "handshake",
  deal_killer: "dangerous",
  profile_chase: "my_location",
  profile_avoid: "block",
  manual_insight: "edit_note",
};

/* ───────────────────────── Shared helpers ───────────────────────── */

function StatusDot({ status }) {
  const color =
    status === "complete"
      ? "bg-tertiary"
      : status === "failed"
        ? "bg-error"
        : status === "running"
          ? "bg-primary animate-pulse"
          : "bg-on-surface-variant/50";
  return <span className={`w-2 h-2 rounded-full shrink-0 ${color}`} />;
}

function statusBadge(status) {
  if (status === "complete") return "bg-tertiary-container text-on-tertiary-container";
  if (status === "failed") return "bg-error-container text-on-error-container";
  if (status === "running") return "bg-primary text-on-primary";
  return "bg-surface-container-high text-on-surface-variant";
}

function greetingFor(d) {
  const h = d.getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

function EmptyMicro({ icon, title, desc, ctaLabel, ctaHref }) {
  return (
    <EmptyState
      size="sm"
      icon={icon}
      title={title}
      body={desc}
      cta={ctaLabel}
      ctaHref={ctaHref}
    />
  );
}
