"use client";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import AppShell from "../components/AppShell";
import CallerIDVerificationModal from "../components/CallerIDVerificationModal";
import { supabase } from "../lib/supabase";
import { useRuns, useVerticals } from "../lib/hooks";

const TABS = [
  { id: "general",      label: "General",     icon: "tune" },
  { id: "callers",      label: "Caller IDs",  icon: "call" },
  { id: "integrations", label: "Integrations", icon: "extension" },
  { id: "runs",         label: "Runs log",    icon: "history" },
  { id: "archived",     label: "Archived",    icon: "inventory_2" },
  { id: "sponsors",     label: "Sponsors",    icon: "verified" },
];

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <AppShell>
          <div className="text-on-surface-variant text-sm py-12 text-center">Loading…</div>
        </AppShell>
      }
    >
      <SettingsPageInner />
    </Suspense>
  );
}

function SettingsPageInner() {
  const search = useSearchParams();
  const initialTab = search?.get("gmail") ? "integrations" : "general";
  const [tab, setTab] = useState(initialTab);

  return (
    <AppShell>
      <div className="mb-6">
        <div className="eyebrow text-on-surface-variant/70 mb-1">Configuration</div>
        <h1 className="display-1 text-on-surface" style={{ fontSize: "2.25rem" }}>
          Settings
        </h1>
        <p className="font-label text-sm text-on-surface-variant mt-1 max-w-2xl">
          Caller IDs, integrations, run history, sponsor tracks.
        </p>
      </div>

      {/* Tab nav */}
      <div className="bg-surface-container-low rounded-2xl editorial-shadow p-1.5 mb-6 flex gap-1 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-headline text-sm font-bold tracking-tight transition-all whitespace-nowrap ${
              tab === t.id
                ? "bg-on-surface text-background shadow-md"
                : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
            }`}
          >
            <span
              className="material-symbols-outlined text-[18px]"
              style={tab === t.id ? { fontVariationSettings: "'FILL' 1" } : {}}
            >
              {t.icon}
            </span>
            {t.label}
          </button>
        ))}
      </div>

      <div className="animate-fade-in">
        {tab === "general" && <GeneralPanel />}
        {tab === "callers" && <CallerIdsPanel />}
        {tab === "integrations" && <IntegrationsPanel />}
        {tab === "runs" && <RunsPanel />}
        {tab === "archived" && <ArchivedVerticalsPanel />}
        {tab === "sponsors" && <SponsorsPanel />}
      </div>
    </AppShell>
  );
}

/* ────────────────────────── General ────────────────────────── */

function GeneralPanel() {
  const vercelEnv = process.env.NEXT_PUBLIC_VERCEL_ENV;
  const envLabel = vercelEnv
    ? vercelEnv.charAt(0).toUpperCase() + vercelEnv.slice(1)
    : process.env.NODE_ENV === "production"
      ? "Production"
      : "Development";
  return (
    <Card title="Account" eyebrow="Workspace">
      <KV label="Operator" value="Kyle Dow" />
      <KV label="Workspace" value="Deals Machine" />
      <KV label="Environment" value={envLabel} />
    </Card>
  );
}

/* ────────────────────────── Caller IDs ────────────────────────── */

function CallerIdsPanel() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [justVerified, setJustVerified] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/caller-id/list", { cache: "no-store" });
      const data = await res.json();
      setList(data?.caller_ids ?? []);
    } catch (_) {
      setList([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <Card
      title="Verified caller IDs"
      eyebrow="Twilio"
      action={
        <button
          onClick={() => setVerifyOpen(true)}
          className="metallic-silk gleam-hover text-on-primary px-4 py-2 rounded-xl font-headline font-bold text-[12.5px] shadow-md hover:-translate-y-px transition-all inline-flex items-center gap-1.5"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          Add phone number
        </button>
      }
    >
      {justVerified && (
        <div className="mb-3 rounded-xl border border-tertiary/40 bg-tertiary-container/60 px-3.5 py-2.5 flex items-center gap-2">
          <span
            className="material-symbols-outlined text-tertiary text-[18px]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            check_circle
          </span>
          <span className="font-label text-[12.5px] text-on-tertiary-container">
            <span className="font-mono font-bold">{justVerified}</span> verified — calls now show this as your caller ID.
          </span>
        </div>
      )}

      {loading ? (
        <div className="skeleton h-20 w-full" />
      ) : list.length === 0 ? (
        <EmptyInline
          icon="call"
          title="No verified caller IDs yet"
          desc="Verify your cell so leads see your real number on outgoing calls. Click Add phone number above to start — Twilio will call you with a 6-digit code."
        />
      ) : (
        <div className="space-y-2">
          {list.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between p-4 bg-surface-container-lowest rounded-xl border border-outline/10"
            >
              <div>
                <div className="font-headline font-semibold text-sm text-on-surface font-mono">
                  {c.phone_e164}
                </div>
                <div className="font-label text-[11px] text-on-surface-variant mt-0.5">
                  {c.verified_at
                    ? `Verified ${new Date(c.verified_at).toLocaleString()}`
                    : "Pending verification"}
                </div>
              </div>
              <StatusPill status={c.verified ? "verified" : "pending"} />
            </div>
          ))}
        </div>
      )}

      {verifyOpen && (
        <CallerIDVerificationModal
          onClose={() => setVerifyOpen(false)}
          onVerified={(phone) => {
            setJustVerified(phone);
            setVerifyOpen(false);
            refresh();
            setTimeout(() => setJustVerified(null), 6000);
          }}
        />
      )}
    </Card>
  );
}

function StatusPill({ status }) {
  const map = {
    verified: { label: "Verified", cls: "bg-tertiary-container text-on-tertiary-container" },
    pending:  { label: "Pending",  cls: "bg-amber-500/12 text-amber-700" },
    failed:   { label: "Failed",   cls: "bg-error-container text-on-error-container" },
  };
  const s = map[status] || map.failed;
  return (
    <span className={`font-label text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold ${s.cls}`}>
      {s.label}
    </span>
  );
}

/* ────────────────────────── Integrations ────────────────────────── */

function IntegrationsPanel() {
  const search = useSearchParams();
  const [gmail, setGmail] = useState(null);
  const [gmailLoading, setGmailLoading] = useState(true);
  const [worker, setWorker] = useState(null);
  const [banner, setBanner] = useState(null);

  const loadGmail = useCallback(async () => {
    setGmailLoading(true);
    try {
      const res = await fetch("/api/auth/google/status", { cache: "no-store" });
      const data = await res.json();
      setGmail(data);
    } catch (err) {
      setGmail({ connected: false, error: err.message });
    } finally {
      setGmailLoading(false);
    }
  }, []);

  const loadWorker = useCallback(async () => {
    try {
      const res = await fetch("/api/worker/health", { cache: "no-store" });
      const data = await res.json();
      setWorker(data);
    } catch (err) {
      setWorker({ ok: false, reachable: false, error: err.message });
    }
  }, []);

  useEffect(() => {
    loadGmail();
    loadWorker();
    const t = setInterval(loadWorker, 30_000);
    return () => clearInterval(t);
  }, [loadGmail, loadWorker]);

  useEffect(() => {
    const flag = search?.get("gmail");
    if (flag === "connected") {
      setBanner({
        kind: "success",
        text: `Gmail connected as ${search.get("email") || "your account"}.`,
      });
    } else if (flag === "error") {
      setBanner({
        kind: "error",
        text: `Could not connect Gmail: ${search.get("message") || "unknown error"}`,
      });
    }
  }, [search]);

  const handleDisconnect = async () => {
    if (!confirm("Disconnect Gmail? Future sends will fall back to the platform email."))
      return;
    await fetch("/api/auth/google/disconnect", { method: "POST" });
    await loadGmail();
    setBanner({ kind: "info", text: "Gmail disconnected." });
  };

  const vultrStatus = worker == null
    ? "checking"
    : worker.ok
      ? "connected"
      : "error";
  const vultrNote = worker == null
    ? "Pinging worker.kyletdow.com…"
    : worker.ok
      ? `worker.kyletdow.com · up ${formatUptime(worker.uptime_seconds)} · ${worker.latency_ms}ms`
      : worker.reachable
        ? `worker.kyletdow.com · HTTP ${worker.status ?? "error"}`
        : `worker.kyletdow.com · ${worker.error ?? "unreachable"}`;

  // Lobster Trap status derived from the worker's /health probe.
  // Container running with classifier enabled = connected; container
  // unreachable but worker present = fallback (in-process regex still
  // works); worker also unreachable = checking.
  const lobster = worker?.checks?.lobster_trap;
  const lobsterStatus = lobster == null
    ? "checking"
    : lobster.ok
      ? "connected"
      : lobster.reachable
        ? "error"
        : "fallback";
  const lobsterNote = lobster == null
    ? "Resolving via worker…"
    : lobster.ok
      ? `Container live · ${lobster.latency_ms}ms · Haiku classifier active`
      : lobster.reachable
        ? `Container reachable but ${lobster.reason ?? "degraded"}`
        : lobster.reason === "not_configured"
          ? "Container not configured · in-process regex + classifier active"
          : `Container unreachable (${lobster.reason ?? "unknown"}) · regex fallback active`;

  // Gmail-aware mailer — if the operator is connected, show Gmail as
  // the active sender. If not, show Resend as fallback. We don't
  // surface both cards anymore — Kyle wanted one mailer card, not two.
  const mailerName = gmail?.connected ? "Gmail" : "Resend (platform fallback)";
  const mailerRole = gmail?.connected ? "Sending as the operator" : "Active sender (until Gmail connects)";
  const mailerNote = gmail?.connected
    ? `${gmail.email} · operator's real Sent folder`
    : "Connect Gmail above to send from your real address";

  const integrations = [
    { name: "Vultr", role: "Worker host", icon: "dns", status: vultrStatus, note: vultrNote },
    { name: "Veea Lobster Trap", role: "Prompt-injection shield", icon: "security", status: lobsterStatus, note: lobsterNote },
    { name: "Supabase", role: "Database + Realtime", icon: "database", status: "connected", note: "Postgres + WebSocket" },
    { name: "Anthropic Claude", role: "Agent reasoning", icon: "auto_awesome", status: "connected", note: "Sonnet 4.6 + Haiku 4.5" },
    { name: "Twilio", role: "Voice calls + caller-ID", icon: "call", status: "connected", note: "Bridge-call pattern" },
    { name: "Speechmatics", role: "Call transcription", icon: "graphic_eq", status: "connected", note: "Batch /jobs/ async" },
    { name: "OpenAI Whisper", role: "Transcription fallback", icon: "graphic_eq", status: "ready", note: "If Speechmatics fails" },
    { name: "Apollo.io", role: "Lead sourcing", icon: "search", status: "connected", note: "/mixed_people/api_search" },
    { name: mailerName, role: mailerRole, icon: "mail", status: "connected", note: mailerNote },
    { name: "HubSpot", role: "CRM push (optional)", icon: "cloud_upload", status: "ready", note: "Wire a Private App token to enable" },
  ];

  return (
    <div className="space-y-4">
      {banner && (
        <div
          className={`rounded-2xl p-4 font-label text-sm flex items-center justify-between gap-3 editorial-shadow-sm ${
            banner.kind === "success"
              ? "bg-tertiary-container text-on-tertiary-container border border-tertiary/30"
              : banner.kind === "error"
                ? "bg-error-container text-on-error-container border border-error/30"
                : "bg-surface-container-high text-on-surface border border-outline/15"
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">
              {banner.kind === "success" ? "check_circle" : banner.kind === "error" ? "error" : "info"}
            </span>
            <span>{banner.text}</span>
          </div>
          <button
            onClick={() => setBanner(null)}
            className="opacity-60 hover:opacity-100 transition-opacity"
            aria-label="Dismiss"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      )}

      <Card title="Your sender" eyebrow="The agent emails from here">
        <GmailConnectCard gmail={gmail} loading={gmailLoading} onDisconnect={handleDisconnect} />
      </Card>

      <Card title="Integrations" eyebrow="What's wired in this build">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {integrations.map((i) => (
            <IntegrationRow key={i.name} {...i} />
          ))}
        </div>
      </Card>
    </div>
  );
}

function IntegrationRow({ name, role, icon, status, note }) {
  return (
    <div className="p-4 bg-surface-container-lowest rounded-xl border border-outline/10 hover:editorial-shadow transition-shadow">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-surface-container-high flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-on-surface text-[18px]">{icon}</span>
          </div>
          <div className="min-w-0">
            <div className="font-headline font-bold text-[13px] text-on-surface tracking-tight truncate">
              {name}
            </div>
            <div className="font-label text-[11px] text-on-surface-variant mt-0.5 truncate">
              {role}
            </div>
          </div>
        </div>
        <IntegrationStatus status={status} />
      </div>
      <div className="font-label text-[11px] text-on-surface-variant/80 font-mono pl-12 leading-snug">
        {note}
      </div>
    </div>
  );
}

function IntegrationStatus({ status }) {
  const map = {
    connected: { label: "Connected", cls: "bg-tertiary-container text-on-tertiary-container" },
    ready:     { label: "Ready",     cls: "bg-blue-500/10 text-blue-700" },
    fallback:  { label: "Fallback",  cls: "bg-amber-500/12 text-amber-700" },
    checking:  { label: "Checking",  cls: "bg-surface-container-high text-on-surface-variant" },
    error:     { label: "Error",     cls: "bg-error-container text-on-error-container" },
  };
  const s = map[status] || map.error;
  return (
    <span className={`font-label text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold shrink-0 ${s.cls}`}>
      {s.label}
    </span>
  );
}

function formatUptime(seconds) {
  if (!seconds || seconds < 0) return "?";
  const s = Math.floor(seconds);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

function GmailConnectCard({ gmail, loading, onDisconnect }) {
  if (loading) {
    return <div className="skeleton h-16 w-full" />;
  }
  if (gmail?.connected) {
    return (
      <div className="flex items-center justify-between gap-3 flex-wrap p-4 bg-tertiary-container/30 rounded-xl border border-tertiary/30">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-tertiary flex items-center justify-center shrink-0">
            <span
              className="material-symbols-outlined text-on-tertiary text-[24px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              mark_email_read
            </span>
          </div>
          <div className="min-w-0">
            <div className="font-headline font-bold text-on-surface text-sm tracking-tight">
              Gmail connected
            </div>
            <div className="font-label text-[13px] text-on-surface-variant mt-0.5">
              Sending as{" "}
              <span className="font-mono font-medium text-on-surface">{gmail.email}</span>
              {gmail.display_name ? ` (${gmail.display_name})` : ""}
            </div>
            <div className="font-label text-[11px] text-on-surface-variant/80 mt-0.5">
              Connected {gmail.connected_at ? timeAgo(gmail.connected_at) : "—"}
              . Emails land in your real Sent folder; replies thread to your inbox.
            </div>
          </div>
        </div>
        <button
          onClick={onDisconnect}
          className="px-4 py-2 rounded-xl font-label text-sm font-semibold border border-outline/20 text-on-surface hover:bg-surface-container-high transition-colors"
        >
          Disconnect
        </button>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-between gap-3 flex-wrap p-4 bg-surface-container-lowest rounded-xl border border-outline/10">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-12 h-12 rounded-2xl bg-surface-container-high flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-on-surface-variant text-[24px]">mail</span>
        </div>
        <div className="min-w-0">
          <div className="font-headline font-bold text-on-surface text-sm tracking-tight">
            Connect your Gmail
          </div>
          <div className="font-label text-[13px] text-on-surface-variant">
            One click. The agent sends follow-up emails from your real address — replies thread to your inbox, sent items land in your Gmail.
          </div>
        </div>
      </div>
      <a
        href="/api/auth/google/start"
        className="metallic-silk text-on-primary px-5 py-2.5 rounded-2xl font-headline font-bold text-sm shadow-lg hover:-translate-y-px hover:shadow-xl transition-all flex items-center gap-2 flex-shrink-0"
      >
        <span className="material-symbols-outlined text-[18px]">login</span>
        Connect Gmail
      </a>
    </div>
  );
}

/* ────────────────────────── Runs log ────────────────────────── */

function RunsPanel() {
  const { runs, loading } = useRuns({ limit: 100 });
  const { verticals } = useVerticals({ includeArchived: true });
  const nameOf = (id) => verticals.find((v) => v.id === id)?.display_name || "—";
  return (
    <Card title="All runs" eyebrow="Newest first">
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton h-14 w-full" />
          ))}
        </div>
      ) : runs.length === 0 ? (
        <EmptyInline icon="bolt" title="No runs yet" desc="Run the agent to populate this log." />
      ) : (
        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {runs.map((r) => (
            <div
              key={r.id}
              className="flex items-start gap-3 p-3 bg-surface-container-lowest rounded-xl border border-outline/10"
            >
              <StatusDot status={r.status} />
              <div className="flex-1 min-w-0">
                <div className="font-label text-sm text-on-surface font-medium leading-snug">
                  {r.summary || "(no summary)"}
                </div>
                <div className="font-label text-[11px] text-on-surface-variant mt-0.5">
                  {nameOf(r.vertical_id)} · {r.triggered_by} · {timeAgo(r.created_at)}
                </div>
                {r.error_message && (
                  <div className="font-label text-[11px] text-on-error-container bg-error-container/40 rounded-md px-2 py-1 mt-1.5 font-mono inline-block">
                    ⚠ {r.error_message}
                  </div>
                )}
              </div>
              <span
                className={`font-label text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold shrink-0 ${statusCls(r.status)}`}
              >
                {r.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

/* ────────────────────────── Archived verticals ────────────────────────── */

function ArchivedVerticalsPanel() {
  const { verticals, refresh } = useVerticals({ includeArchived: true });
  const archived = verticals.filter((v) => !v.active);
  const active = verticals.filter((v) => v.active);

  const restore = async (id) => {
    if (!supabase) return;
    await supabase.from("verticals").update({ active: true }).eq("id", id);
    refresh();
  };
  const archive = async (id) => {
    if (!supabase) return;
    await supabase.from("verticals").update({ active: false }).eq("id", id);
    refresh();
  };

  return (
    <div className="space-y-4">
      <Card title="Archive a vertical" eyebrow="Hide from main lists without deleting data">
        {active.length === 0 ? (
          <EmptyInline icon="track_changes" title="No active verticals" />
        ) : (
          <div className="space-y-2">
            {active.map((v) => (
              <VerticalManageRow
                key={v.id}
                vertical={v}
                ctaLabel="Archive"
                ctaTone="destructive"
                onClick={() => archive(v.id)}
              />
            ))}
          </div>
        )}
      </Card>

      <Card title="Archived" eyebrow="Restore any to put it back in rotation">
        {archived.length === 0 ? (
          <EmptyInline icon="inventory_2" title="Nothing archived" />
        ) : (
          <div className="space-y-2">
            {archived.map((v) => (
              <VerticalManageRow
                key={v.id}
                vertical={v}
                ctaLabel="Restore"
                ctaTone="primary"
                onClick={() => restore(v.id)}
                dim
              />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function VerticalManageRow({ vertical, ctaLabel, ctaTone, onClick, dim }) {
  return (
    <div
      className={`flex items-center justify-between p-4 bg-surface-container-lowest rounded-xl border border-outline/10 ${
        dim ? "opacity-70" : ""
      }`}
    >
      <div className="min-w-0">
        <div className="font-headline font-semibold text-sm text-on-surface tracking-tight truncate">
          {vertical.display_name}
        </div>
        <div className="font-label text-[11px] text-on-surface-variant mt-0.5 font-mono">
          {vertical.slug}
        </div>
      </div>
      <button
        onClick={onClick}
        className={`px-3 py-1.5 rounded-lg font-label text-xs font-bold transition-colors ${
          ctaTone === "destructive"
            ? "bg-surface-container-high text-on-surface-variant hover:bg-error-container hover:text-on-error-container"
            : "bg-on-surface text-background hover:opacity-90"
        }`}
      >
        {ctaLabel}
      </button>
    </div>
  );
}

/* ────────────────────────── Sponsors ────────────────────────── */

function SponsorsPanel() {
  const sponsors = [
    {
      name: "Vultr",
      role: "Cloud compute · sponsor track",
      icon: "dns",
      desc: "The Fastify worker runs on a Vultr Ubuntu 24.04 instance with systemd + Caddy reverse proxy. Every agent reasoning step, Apollo call, Twilio bridge, and Speechmatics job flows through Vultr — the Lobster Trap container deploys here too.",
    },
    {
      name: "Speechmatics",
      role: "Call transcription · sponsor track",
      icon: "graphic_eq",
      desc: "Every recorded call is transcribed via Speechmatics' async batch /jobs/ endpoint with speaker diarization. The transcript feeds the brain extraction step so each call makes the agent smarter — and triggers an auto-drafted follow-up email.",
    },
    {
      name: "Veea",
      role: "Edge security · sponsor track",
      icon: "security",
      desc: "Lobster Trap (prompt-injection shield) is integrated into the chat + transcript ingestion paths. Layered detection: regex first (11 patterns, instant), Claude Haiku classifier second. Container ships in `/lobster-trap` and deploys alongside the worker on Vultr; would migrate to a VeeaHub edge gateway in production via a single env-var swap.",
    },
  ];
  return (
    <Card title="Sponsor tracks" eyebrow="Hackathon partner tech in use">
      <div className="space-y-3">
        {sponsors.map((s) => (
          <div
            key={s.name}
            className="p-5 bg-surface-container-lowest rounded-2xl border border-outline/10"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl metallic-silk flex items-center justify-center shrink-0 shadow-md">
                <span
                  className="material-symbols-outlined text-on-primary text-[22px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  {s.icon}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between mb-1 gap-2 flex-wrap">
                  <div className="font-headline font-extrabold text-base text-on-surface tracking-tight">
                    {s.name}
                  </div>
                  <span className="eyebrow text-on-surface-variant/80">{s.role}</span>
                </div>
                <p className="font-label text-[13px] text-on-surface-variant leading-relaxed">
                  {s.desc}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ────────────────────────── Shared primitives ────────────────────────── */

function Card({ title, eyebrow, children, action }) {
  return (
    <div className="bg-surface-container-low rounded-2xl p-5 editorial-shadow">
      <div className="mb-4 pb-3 border-b border-outline/10 flex items-start justify-between gap-3">
        <div className="min-w-0">
          {eyebrow && (
            <div className="eyebrow text-on-surface-variant/60 mb-0.5">{eyebrow}</div>
          )}
          <div className="font-headline font-bold text-base text-on-surface tracking-tight">
            {title}
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children}
    </div>
  );
}

function KV({ label, value }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-outline/10 last:border-0 font-label text-sm">
      <span className="text-on-surface-variant">{label}</span>
      <span className="text-on-surface font-medium">{value}</span>
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
  return <span className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${c}`} />;
}

function statusCls(status) {
  if (status === "complete") return "bg-tertiary-container text-on-tertiary-container";
  if (status === "failed") return "bg-error-container text-on-error-container";
  if (status === "running") return "bg-primary text-on-primary";
  return "bg-surface-container-high text-on-surface-variant";
}

function EmptyInline({ icon, title, desc }) {
  return (
    <div className="py-8 text-center">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-surface-container-high mb-3">
        <span
          className="material-symbols-outlined text-on-surface-variant"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          {icon}
        </span>
      </div>
      <div className="font-headline font-bold text-sm text-on-surface mb-1">{title}</div>
      {desc && (
        <div className="font-label text-xs text-on-surface-variant max-w-[34ch] mx-auto leading-relaxed">
          {desc}
        </div>
      )}
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
