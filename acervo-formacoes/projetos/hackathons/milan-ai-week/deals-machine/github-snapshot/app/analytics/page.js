"use client";
import { useEffect, useState, useMemo } from "react";
import AppShell from "../components/AppShell";
import { supabase } from "../lib/supabase";
import { useDashboardStats, useVerticals } from "../lib/hooks";

const OUTCOME_PALETTE = {
  positive: "#1b5e3c",
  in_hubspot: "#1f1612",
  follow_up: "#d4a04e",
  callback: "#4361b3",
  called: "#5e7fc8",
  negative: "#b3261e",
  gatekeeper: "#7a6e58",
  new: "#bcae93",
};
const OUTCOME_LABEL = {
  positive: "Interested",
  in_hubspot: "In CRM",
  follow_up: "Follow up",
  callback: "Callback",
  called: "Called",
  negative: "Not interested",
  gatekeeper: "Wrong contact",
  new: "New",
};

export default function AnalyticsPage() {
  const { stats } = useDashboardStats();
  const { verticals } = useVerticals();
  const [allLeads, setAllLeads] = useState([]);
  const [allEntries, setAllEntries] = useState([]);
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    (async () => {
      const [{ data: leads }, { data: entries }, { data: callsData }] = await Promise.all([
        supabase.from("leads").select("id, vertical_id, status, created_at").limit(2000),
        supabase.from("brain_entries").select("id, vertical_id, created_at, type").limit(2000),
        supabase
          .from("calls")
          .select("id, vertical_id, status, recording_duration_seconds, created_at")
          .limit(2000),
      ]);
      setAllLeads(leads || []);
      setAllEntries(entries || []);
      setCalls(callsData || []);
      setLoading(false);
    })();
  }, []);

  const outcomeCounts = useMemo(() => {
    const c = {};
    for (const l of allLeads) c[l.status] = (c[l.status] || 0) + 1;
    return c;
  }, [allLeads]);

  const verticalPerf = useMemo(() => {
    return verticals
      .map((v) => {
        const leads = allLeads.filter((l) => l.vertical_id === v.id);
        const total = leads.length;
        const interested = leads.filter((l) => l.status === "positive").length;
        const inCrm = leads.filter((l) => l.status === "in_hubspot").length;
        const negative = leads.filter((l) => l.status === "negative").length;
        const winRate = total > 0 ? (interested + inCrm) / total : 0;
        return { v, total, interested, inCrm, negative, winRate };
      })
      .sort((a, b) => b.winRate - a.winRate);
  }, [verticals, allLeads]);

  const dayBuckets = useMemo(() => {
    const days = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      days.push({ date: d, entries: 0, leads: 0 });
    }
    for (const e of allEntries) {
      const dt = new Date(e.created_at);
      dt.setHours(0, 0, 0, 0);
      const match = days.find((x) => x.date.getTime() === dt.getTime());
      if (match) match.entries += 1;
    }
    for (const l of allLeads) {
      const dt = new Date(l.created_at);
      dt.setHours(0, 0, 0, 0);
      const match = days.find((x) => x.date.getTime() === dt.getTime());
      if (match) match.leads += 1;
    }
    let runningEntries = 0;
    return days.map((d) => ({
      ...d,
      runningEntries: (runningEntries += d.entries),
    }));
  }, [allEntries, allLeads]);

  const totalCallTime = useMemo(
    () => calls.reduce((s, c) => s + (c.recording_duration_seconds || 0), 0),
    [calls]
  );

  return (
    <AppShell>
      <div className="mb-6">
        <div className="eyebrow text-on-surface-variant/70 mb-1">Performance</div>
        <h1 className="display-1 text-on-surface" style={{ fontSize: "2.25rem" }}>
          Analytics
        </h1>
        <p className="font-label text-sm text-on-surface-variant mt-1 max-w-2xl">
          How the agent and you are doing. Every tagged outcome teaches the brain — these are the results.
        </p>
      </div>

      {/* Stat row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Stat
          icon="groups"
          label="Total leads"
          value={stats.leadsTotal}
          sub={`${allLeads.filter((l) => l.status === "new").length} unworked`}
        />
        <Stat
          icon="thumb_up"
          label="Interested"
          value={outcomeCounts.positive || 0}
          sub={`${pct(outcomeCounts.positive, allLeads.length)} of pipeline`}
          accent="emerald"
        />
        <Stat
          icon="call"
          label="Calls placed"
          value={stats.callsTotal}
          sub={`${formatDuration(totalCallTime)} on the phone`}
        />
        <Stat
          icon="psychology"
          label="Brain entries"
          value={stats.knowledgeEntries}
          sub="things the agent learned"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
        <Card title="Call outcomes" eyebrow="Distribution">
          {Object.keys(outcomeCounts).length === 0 ? (
            <Empty icon="ballot" label="No outcomes tagged yet. Work through leads and press 1–5 to populate this." />
          ) : (
            <div>
              <StackedBar data={outcomeCounts} />
              <div className="mt-5 space-y-2">
                {Object.entries(outcomeCounts)
                  .sort(([, a], [, b]) => b - a)
                  .map(([status, count]) => (
                    <LegendRow
                      key={status}
                      color={OUTCOME_PALETTE[status] || "#71717a"}
                      label={OUTCOME_LABEL[status] || status}
                      count={count}
                      total={allLeads.length}
                    />
                  ))}
              </div>
            </div>
          )}
        </Card>

        <Card title="Knowledge growth" eyebrow="Last 14 days">
          {allEntries.length === 0 ? (
            <Empty icon="psychology" label="The brain is empty. After a few calls, learned insights show up here." />
          ) : (
            <Sparkline data={dayBuckets} />
          )}
        </Card>

        <Card title="Weekly pulse" eyebrow="Right now">
          <div className="space-y-2">
            <KV label="Runs today" value={stats.runsToday} />
            <KV label="Active right now" value={stats.activeRuns} accent={stats.activeRuns > 0} />
            <KV label="Verticals live" value={stats.verticals} />
            <KV label="Calls placed" value={stats.callsTotal} />
            <KV label="Knowledge accrued" value={stats.knowledgeEntries} />
          </div>
        </Card>
      </div>

      {/* Daily leads chart */}
      <Card title="Leads sourced per day" eyebrow="Last 14 days" className="mb-6">
        {allLeads.length === 0 ? (
          <Empty icon="groups" label="No leads sourced yet. Run the agent to start populating this chart." />
        ) : (
          <DailyLeadsChart data={dayBuckets} />
        )}
      </Card>

      {/* Vertical leaderboard */}
      <Card
        title="Vertical leaderboard"
        eyebrow={`Win rate · (Interested + In CRM) / total`}
      >
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-10 w-full" />
            ))}
          </div>
        ) : verticalPerf.length === 0 ? (
          <Empty icon="track_changes" label="No verticals to compare yet. Build a second vertical and the leaderboard fills in." />
        ) : (
          <div className="space-y-4">
            {verticalPerf.map((p, i) => (
              <LeaderboardRow key={p.v.id} rank={i + 1} {...p} />
            ))}
          </div>
        )}
      </Card>
    </AppShell>
  );
}

/* ────────────────────────── Stat ────────────────────────── */

function Stat({ icon, label, value, sub, accent }) {
  return (
    <div className="bg-surface-container-low rounded-2xl p-4 editorial-shadow">
      <div className="flex items-center gap-2 mb-2">
        <span
          className={`material-symbols-outlined text-[18px] ${
            accent === "emerald" ? "text-tertiary" : "text-on-surface-variant"
          }`}
        >
          {icon}
        </span>
        <span className="eyebrow text-on-surface-variant">{label}</span>
      </div>
      <p className="font-headline font-extrabold text-3xl text-on-surface tabular-nums tracking-tight">
        {value}
      </p>
      {sub && (
        <p className="font-label text-[11.5px] text-on-surface-variant mt-1">{sub}</p>
      )}
    </div>
  );
}

/* ────────────────────────── Card ────────────────────────── */

function Card({ title, eyebrow, children, className = "" }) {
  return (
    <div
      className={`bg-surface-container-low rounded-2xl p-5 editorial-shadow ${className}`}
    >
      <div className="mb-4 pb-3 border-b border-outline/10">
        {eyebrow && (
          <div className="eyebrow text-on-surface-variant/60 mb-0.5">{eyebrow}</div>
        )}
        <div className="font-headline font-bold text-base text-on-surface tracking-tight">
          {title}
        </div>
      </div>
      {children}
    </div>
  );
}

function KV({ label, value, accent }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-outline/10 last:border-0">
      <span className="font-label text-sm text-on-surface-variant">{label}</span>
      <span
        className={`font-headline font-bold text-base tabular-nums ${
          accent ? "text-tertiary" : "text-on-surface"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

/* ────────────────────────── Stacked bar (outcomes) ────────────────────────── */

function StackedBar({ data }) {
  const total = Object.values(data).reduce((s, n) => s + n, 0) || 1;
  return (
    <div className="h-4 rounded-full overflow-hidden flex shadow-inner bg-surface-container-high">
      {Object.entries(data)
        .sort(([, a], [, b]) => b - a)
        .map(([status, count]) => (
          <div
            key={status}
            style={{
              width: `${(count / total) * 100}%`,
              background: OUTCOME_PALETTE[status] || "#71717a",
            }}
            title={`${OUTCOME_LABEL[status] || status}: ${count}`}
            className="transition-all hover:brightness-110"
          />
        ))}
    </div>
  );
}

function LegendRow({ color, label, count, total }) {
  const p = total > 0 ? count / total : 0;
  return (
    <div className="flex items-center gap-3 font-label text-[12.5px]">
      <span
        className="w-3 h-3 rounded-sm flex-shrink-0"
        style={{ background: color }}
      />
      <span className="text-on-surface flex-1 font-medium">{label}</span>
      <span className="text-on-surface-variant tabular-nums">
        <span className="text-on-surface font-bold">{count}</span>{" "}
        <span className="text-on-surface-variant/60">({(p * 100).toFixed(0)}%)</span>
      </span>
    </div>
  );
}

/* ────────────────────────── Sparkline (knowledge growth) ────────────────────────── */

function Sparkline({ data }) {
  const max = Math.max(...data.map((d) => d.runningEntries), 1);
  const w = 100;
  const h = 100;
  const step = w / Math.max(1, data.length - 1);
  const points = data
    .map(
      (d, i) =>
        `${(i * step).toFixed(2)},${(h - (d.runningEntries / max) * h).toFixed(2)}`
    )
    .join(" ");
  const last = data[data.length - 1]?.runningEntries ?? 0;
  const todayCount = data[data.length - 1]?.entries ?? 0;
  return (
    <div>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        className="w-full h-32"
      >
        <defs>
          <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.25" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polyline
          points={`0,${h} ${points} ${w},${h}`}
          fill="url(#spark-fill)"
          className="text-on-surface"
        />
        <polyline
          points={points}
          fill="none"
          stroke="currentColor"
          className="text-on-surface"
          strokeWidth="1.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
      <div className="flex items-baseline justify-between mt-3 pt-3 border-t border-outline/10">
        <div>
          <div className="font-headline font-extrabold text-3xl text-on-surface tabular-nums">
            {last}
          </div>
          <div className="font-label text-[11px] text-on-surface-variant">total entries</div>
        </div>
        <div className="text-right">
          <div
            className={`font-headline font-bold text-sm tabular-nums ${todayCount > 0 ? "text-tertiary" : "text-on-surface-variant"}`}
          >
            {todayCount > 0 ? `+${todayCount}` : "0"}
          </div>
          <div className="font-label text-[11px] text-on-surface-variant">today</div>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────── Daily leads bar chart ────────────────────────── */

function DailyLeadsChart({ data }) {
  const max = Math.max(...data.map((d) => d.leads), 1);
  return (
    <div>
      <div className="flex items-end gap-1.5 h-32">
        {data.map((d, i) => {
          const h = (d.leads / max) * 100;
          const isWeekend = [0, 6].includes(d.date.getDay());
          return (
            <div key={i} className="flex-1 flex flex-col items-center justify-end group">
              <div className="font-label text-[10px] text-on-surface-variant mb-1 opacity-0 group-hover:opacity-100 transition-opacity tabular-nums">
                {d.leads}
              </div>
              <div
                className={`w-full rounded-t-md transition-all ${isWeekend ? "bg-on-surface/20" : "bg-on-surface/70"} group-hover:bg-on-surface`}
                style={{ height: `${Math.max(h, d.leads > 0 ? 4 : 0)}%`, minHeight: d.leads > 0 ? 4 : 0 }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex justify-between mt-2 pt-3 border-t border-outline/10">
        {data.map((d, i) => (
          <div
            key={i}
            className={`flex-1 text-center font-label text-[9.5px] uppercase tracking-wider tabular-nums ${
              i === data.length - 1
                ? "text-on-surface font-bold"
                : "text-on-surface-variant/60"
            }`}
          >
            {d.date.toLocaleDateString(undefined, { weekday: "narrow" })}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ────────────────────────── Leaderboard ────────────────────────── */

function LeaderboardRow({ rank, v, total, interested, inCrm, negative, winRate }) {
  const pctWin = Math.round(winRate * 100);
  return (
    <div className="bg-surface-container-lowest rounded-xl p-4 border border-outline/10 hover:editorial-shadow transition-shadow">
      <div className="flex items-center justify-between mb-2.5 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center font-headline font-extrabold text-[12px] ${
              rank === 1
                ? "bg-primary text-on-primary"
                : "bg-surface-container-high text-on-surface-variant"
            }`}
          >
            {rank}
          </div>
          <div className="min-w-0">
            <div className="font-headline font-bold text-sm text-on-surface truncate tracking-tight">
              {v.display_name}
            </div>
            <div className="font-label text-[11px] text-on-surface-variant mt-0.5 tabular-nums">
              {interested} interested · {inCrm} in CRM · {total} total · {negative} no
            </div>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="font-headline font-extrabold text-2xl text-on-surface tabular-nums tracking-tight leading-none">
            {pctWin}%
          </div>
          <div className="eyebrow text-on-surface-variant/70 mt-0.5">Win rate</div>
        </div>
      </div>
      <div className="h-1.5 bg-surface-container-high rounded-full overflow-hidden">
        <div
          className="h-full bg-on-surface transition-all"
          style={{ width: `${Math.max(2, pctWin)}%` }}
        />
      </div>
    </div>
  );
}

/* ────────────────────────── Empty + helpers ────────────────────────── */

function Empty({ label, icon = "monitoring" }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center gap-2.5">
      <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-surface-container-high">
        <span
          className="material-symbols-outlined text-on-surface-variant text-[20px]"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          {icon}
        </span>
      </div>
      <div className="font-label text-[12.5px] text-on-surface-variant max-w-[42ch] leading-snug">
        {label}
      </div>
    </div>
  );
}

function pct(num, total) {
  if (!total || !num) return "0%";
  const v = (num / total) * 100;
  if (!Number.isFinite(v)) return "0%";
  return `${v.toFixed(0)}%`;
}

function formatDuration(sec) {
  if (!sec) return "0m";
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}
