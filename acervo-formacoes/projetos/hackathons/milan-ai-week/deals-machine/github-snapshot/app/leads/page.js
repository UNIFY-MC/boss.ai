"use client";
import { Suspense, memo, useEffect, useState, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import AppShell from "../components/AppShell";
import CallButton from "../components/CallButton";
import CallerIDVerificationModal from "../components/CallerIDVerificationModal";
import FollowUpEmailModal from "../components/FollowUpEmailModal";
import TranscriptPasteModal from "../components/TranscriptPasteModal";
import EditLeadModal from "../components/EditLeadModal";
import AddLeadModal from "../components/AddLeadModal";
import LeadBrainPanel from "../components/LeadBrainPanel";
import LeadCRMPanel from "../components/LeadCRMPanel";
import ScriptCard from "../components/ScriptCard";
import CallReviewModal from "../components/CallReviewModal";
import CoachPanel from "../components/CoachPanel";
import PostCallPanel from "../components/PostCallPanel";
import VerticalFilterDropdown from "../components/VerticalFilterDropdown";
import { supabase } from "../lib/supabase";
import { useVerticals } from "../lib/hooks";
import { subscribeDraftsForLead } from "../lib/realtime";
import { recordOutcomeInBrain, removeOutcomeFromBrain } from "../lib/brain-from-outcome";

const OUTCOMES = [
  { id: "positive",   label: "Interested",     icon: "thumb_up",         color: "emerald", key: "1" },
  { id: "callback",   label: "Callback later", icon: "schedule",         color: "indigo",  key: "2" },
  { id: "follow_up",  label: "Follow up",      icon: "mark_email_read",  color: "amber",   key: "3" },
  { id: "negative",   label: "Not interested", icon: "thumb_down",       color: "rose",    key: "4" },
  { id: "gatekeeper", label: "Wrong contact",  icon: "block",            color: "slate",   key: "5" },
];

const STATUS_LABELS = {
  new: "New",
  called: "Called",
  positive: "Interested",
  callback: "Callback",
  they_callback: "They'll call",
  follow_up: "Follow up",
  negative: "Not interested",
  gatekeeper: "Wrong contact",
  in_hubspot: "Pushed to CRM",
  deleted: "Removed",
};

const VISIBLE_FILTER_STATUSES = ["new", "called", "positive", "callback", "follow_up", "negative", "gatekeeper", "in_hubspot"];

export default function LeadsPage() {
  return (
    <Suspense
      fallback={
        <AppShell>
          <div className="text-on-surface-variant text-sm py-12 text-center">Loading…</div>
        </AppShell>
      }
    >
      <LeadsPageInner />
    </Suspense>
  );
}

function LeadsPageInner() {
  const params = useSearchParams();
  const initialVertical = params?.get("vertical") || null;
  const initialRunId = params?.get("run") || null;

  const { verticals } = useVerticals();
  // Multi-select Set of included vertical IDs. null until first init.
  const [selectedVerticalIds, setSelectedVerticalIds] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [reviewCall, setReviewCall] = useState(null);
  const [brainToast, setBrainToast] = useState(null);
  const [draftsByLead, setDraftsByLead] = useState({});
  const [sendingOneClick, setSendingOneClick] = useState(false);
  const [sendToast, setSendToast] = useState(null);

  // Initialize the filter set once verticals load. If a ?vertical= URL
  // param was passed, narrow to that single vertical; otherwise include
  // everything.
  useEffect(() => {
    if (selectedVerticalIds === null && verticals.length > 0) {
      const initial = initialVertical
        ? verticals.filter((v) => v.slug === initialVertical).map((v) => v.id)
        : verticals.map((v) => v.id);
      setSelectedVerticalIds(new Set(initial));
    }
  }, [verticals, selectedVerticalIds, initialVertical]);

  const toggleVertical = (vid) => {
    setSelectedVerticalIds((prev) => {
      const next = new Set(prev || []);
      if (next.has(vid)) next.delete(vid);
      else next.add(vid);
      return next;
    });
  };
  const clearVerticalFilter = () => setSelectedVerticalIds(new Set());
  const selectAllVerticals = () =>
    setSelectedVerticalIds(new Set(verticals.map((v) => v.id)));

  const fetchLeads = useCallback(async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    // Wait for the filter to initialize so we don't flash all leads first
    if (selectedVerticalIds === null) return;
    if (selectedVerticalIds.size === 0) {
      setLeads([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    let q = supabase
      .from("leads")
      .select(
        "id, vertical_id, run_id, name, title, company, location, phone, email, domain, status, pain_level, hubspot_id, pushed_at, memory_summary, deal_value_usd, next_action, next_action_due, pipeline_stage, pipeline_stage_at, trigger_event, account_id, created_at, updated_at"
      )
      .in("vertical_id", Array.from(selectedVerticalIds))
      .order("created_at", { ascending: false })
      .limit(200);
    if (initialRunId) q = q.eq("run_id", initialRunId);
    const { data } = await q;
    setLeads(data || []);
    setLoading(false);
  }, [selectedVerticalIds, initialRunId]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const fetchDrafts = useCallback(async () => {
    if (!supabase || leads.length === 0) {
      setDraftsByLead({});
      return;
    }
    const ids = leads.map((l) => l.id);
    const { data } = await supabase
      .from("email_drafts")
      .select("id, lead_id, subject, body, created_at")
      .in("lead_id", ids)
      .eq("status", "ready")
      .order("created_at", { ascending: false });
    const map = {};
    for (const d of data || []) {
      if (!map[d.lead_id]) map[d.lead_id] = d;
    }
    setDraftsByLead(map);
  }, [leads]);

  useEffect(() => {
    fetchDrafts();
  }, [fetchDrafts]);

  // Live-update the drafts map when a draft lands for the currently-selected
  // lead. The post-call pipeline writes email_drafts about ~10s after the
  // recording is ready; without realtime, the draft hero card only appears
  // after a manual page refresh.
  //
  // The draft shows inline as a hero card on the lead detail — that's the
  // operator's read of "draft ready." The modal only opens when they
  // explicitly click "Review & edit"; auto-opening it was disruptive to
  // the workflow (tested 2026-05-17).
  useEffect(() => {
    if (!selectedId) return;
    const unsub = subscribeDraftsForLead(
      selectedId,
      (payload) => {
        const row = payload.new ?? payload.old;
        if (!row) return;
        setDraftsByLead((prev) => {
          const next = { ...prev };
          if (row.status === "ready") {
            next[row.lead_id] = row;
          } else if (next[row.lead_id]?.id === row.id) {
            // Draft was discarded/sent — clear it.
            delete next[row.lead_id];
          }
          return next;
        });
      },
      "leads-page",
    );
    return () => unsub?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const filtered = useMemo(() => {
    let out = leads;
    if (statusFilter !== "all") out = out.filter((l) => l.status === statusFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      out = out.filter(
        (l) =>
          l.name?.toLowerCase().includes(q) ||
          l.company?.toLowerCase().includes(q) ||
          l.title?.toLowerCase().includes(q)
      );
    }
    return out;
  }, [leads, statusFilter, search]);

  useEffect(() => {
    if (filtered.length > 0 && !filtered.find((l) => l.id === selectedId)) {
      setSelectedId(filtered[0].id);
    }
  }, [filtered, selectedId]);

  const selected = leads.find((l) => l.id === selectedId);
  const selectedVertical = selected
    ? verticals.find((v) => v.id === selected.vertical_id) || null
    : null;
  // Stable callback so memoized LeadRow can actually skip re-renders.
  const handleSelectLead = useCallback((id) => setSelectedId(id), []);

  const setLeadStatus = useCallback(
    async (leadId, status) => {
      if (!supabase) return;
      const lead = leads.find((l) => l.id === leadId);
      if (!lead) return;

      // Toggle off: clicking the currently-active outcome reverts the
      // status back to "called" (or "new" if no call was ever placed)
      // and removes the brain entry that was written for that outcome.
      const isToggleOff =
        lead.status === status &&
        ["positive", "negative", "gatekeeper", "callback", "follow_up"].includes(status);

      const nextStatus = isToggleOff ? "called" : status;
      const nowIso = new Date().toISOString();

      setLeads((prev) =>
        prev.map((l) =>
          l.id === leadId ? { ...l, status: nextStatus, updated_at: nowIso } : l
        )
      );
      await supabase
        .from("leads")
        .update({ status: nextStatus, updated_at: nowIso })
        .eq("id", leadId);

      if (isToggleOff) {
        const result = await removeOutcomeFromBrain(lead, status);
        if (result?.reverted) {
          setBrainToast({ type: "revert", id: Date.now() });
          setTimeout(() => setBrainToast(null), 2800);
        }
      } else if (["positive", "negative", "gatekeeper", "callback", "follow_up"].includes(status)) {
        const result = await recordOutcomeInBrain(lead, status);
        if (result?.written) {
          setBrainToast({ type: result.type, id: Date.now() });
          setTimeout(() => setBrainToast(null), 2800);
        }
      }
    },
    [leads]
  );

  useEffect(() => {
    const handler = (e) => {
      if (!selected) return;
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      const match = OUTCOMES.find((o) => o.key === e.key);
      if (match) {
        e.preventDefault();
        setLeadStatus(selected.id, match.id);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selected, setLeadStatus]);

  const sendDraftNow = async (lead) => {
    const draft = draftsByLead[lead.id];
    if (!draft || sendingOneClick) return;
    if (!lead.email) {
      setSendToast({ kind: "error", text: "Lead has no email on file." });
      setTimeout(() => setSendToast(null), 3000);
      return;
    }
    setSendingOneClick(true);
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
          draft_id: draft.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setSendToast({ kind: "success", text: `Sent to ${lead.name || lead.email} via ${data.via}` });
      setTimeout(() => setSendToast(null), 3000);
      setDraftsByLead((prev) => {
        const next = { ...prev };
        delete next[lead.id];
        return next;
      });
      setLeads((prev) =>
        prev.map((l) =>
          l.id === lead.id && !["positive", "negative", "in_hubspot"].includes(l.status)
            ? { ...l, status: "follow_up", updated_at: new Date().toISOString() }
            : l
        )
      );
    } catch (err) {
      setSendToast({ kind: "error", text: err.message });
      setTimeout(() => setSendToast(null), 4000);
    } finally {
      setSendingOneClick(false);
    }
  };

  const pushToHubspot = async (lead) => {
    if (!lead) return;
    try {
      const res = await fetch("/api/hubspot/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead_id: lead.id }),
      });
      if (res.ok) await setLeadStatus(lead.id, "in_hubspot");
    } catch (err) {
      console.error("[Leads] hubspot push failed:", err);
    }
  };

  const counts = useMemo(() => {
    const c = { all: leads.length };
    for (const l of leads) c[l.status] = (c[l.status] || 0) + 1;
    return c;
  }, [leads]);

  const draftCount = useMemo(() => Object.keys(draftsByLead).length, [draftsByLead]);

  return (
    <AppShell>
      {/* Page header */}
      <div className="mb-6 flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="eyebrow text-on-surface-variant/70 mb-1">Pipeline</div>
          <h1 className="display-1 text-on-surface" style={{ fontSize: "2.25rem" }}>
            Leads
          </h1>
          <p className="font-label text-sm text-on-surface-variant mt-1 max-w-2xl">
            Call. Tag the outcome — try hotkeys <Kbd>1</Kbd>–<Kbd>5</Kbd>. The brain learns from every choice.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {draftCount > 0 && (
            <div className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-amber-500/10 text-amber-700 border border-amber-500/30 font-label text-xs font-bold">
              <span className="material-symbols-outlined text-[16px]">edit_note</span>
              {draftCount} draft{draftCount === 1 ? "" : "s"} ready
            </div>
          )}
          <button
            onClick={() => setAddOpen(true)}
            className="metallic-silk gleam-hover text-on-primary px-4 py-2.5 rounded-xl font-headline font-bold text-sm shadow-lg hover:-translate-y-px transition-all inline-flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">person_add</span>
            Add lead
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <FilterBar
        verticals={verticals}
        selectedVerticalIds={selectedVerticalIds || new Set()}
        onToggleVertical={toggleVertical}
        onClearVerticals={clearVerticalFilter}
        onSelectAllVerticals={selectAllVerticals}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        search={search}
        setSearch={setSearch}
        counts={counts}
      />

      {/* Two-col layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mt-4">
        <div className="lg:col-span-5 xl:col-span-4 bg-surface-container-low rounded-2xl editorial-shadow overflow-hidden flex flex-col self-start lg:sticky lg:top-20" style={{ maxHeight: "calc(100vh - 6rem)" }}>
          <div className="px-5 py-3 border-b border-outline/10 flex items-center justify-between shrink-0">
            <div className="eyebrow text-on-surface-variant">
              {filtered.length} {filtered.length === 1 ? "lead" : "leads"}
            </div>
            {loading && <div className="skeleton h-2 w-12" />}
          </div>
          <div className="flex-1 overflow-y-auto min-h-0">
            {loading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="skeleton h-16 w-full" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <EmptyLeads />
            ) : (
              <div className="divide-y divide-outline/10">
                {filtered.map((lead) => (
                  <LeadRow
                    key={lead.id}
                    lead={lead}
                    hasDraft={!!draftsByLead[lead.id]}
                    selected={lead.id === selectedId}
                    onSelect={handleSelectLead}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-7 xl:col-span-8">
          {selected ? (
            <LeadDetail
              lead={selected}
              vertical={selectedVertical}
              draft={draftsByLead[selected.id] || null}
              sending={sendingOneClick}
              onSendDraftNow={() => sendDraftNow(selected)}
              onOutcome={(status) => setLeadStatus(selected.id, status)}
              onPushHubspot={() => pushToHubspot(selected)}
              onNeedsVerification={() => setVerifyOpen(true)}
              onSendEmail={() => setEmailOpen(true)}
              onPasteTranscript={() => setTranscriptOpen(true)}
              onEditLead={() => setEditOpen(true)}
              onLeadUpdated={(updated) =>
                setLeads((prev) => prev.map((l) => (l.id === updated.id ? { ...l, ...updated } : l)))
              }
              onDiscardDraft={async () => {
                const d = draftsByLead[selected.id];
                if (!d || !supabase) return;
                // Optimistic — drop locally so the hero card disappears now.
                setDraftsByLead((prev) => {
                  const next = { ...prev };
                  delete next[selected.id];
                  return next;
                });
                await supabase
                  .from("email_drafts")
                  .update({ status: "discarded" })
                  .eq("id", d.id);
              }}
              onReviewLastCall={async () => {
                if (!selected?.id || !supabase) return;
                // Pull the 5 most recent calls that have a transcript_id set,
                // then verify the transcripts row actually has text. Skip past
                // calls whose transcription never completed (transcript row
                // exists but text is empty) so we always score the most recent
                // *reviewable* call, not the most recent attempted call.
                const { data: candidates } = await supabase
                  .from("calls")
                  .select(
                    "id, lead_id, vertical_id, transcript_id, playbook_snapshot, enrichment, outcome_signal, created_at",
                  )
                  .eq("lead_id", selected.id)
                  .not("transcript_id", "is", null)
                  .order("created_at", { ascending: false })
                  .limit(5);

                if (candidates && candidates.length > 0) {
                  const { data: transcripts } = await supabase
                    .from("transcripts")
                    .select("id, raw_text")
                    .in("id", candidates.map((c) => c.transcript_id));
                  const textById = new Map(
                    (transcripts || []).map((t) => [t.id, t.raw_text || ""]),
                  );
                  const reviewable = candidates.find(
                    (c) => (textById.get(c.transcript_id) || "").trim().length > 0,
                  );
                  if (reviewable) {
                    setReviewCall(reviewable);
                    return;
                  }
                }

                // Nothing reviewable yet — figure out why so the toast is useful.
                const { data: recent } = await supabase
                  .from("calls")
                  .select("id, status, created_at")
                  .eq("lead_id", selected.id)
                  .order("created_at", { ascending: false })
                  .limit(1)
                  .maybeSingle();
                const ageSec = recent
                  ? Math.floor((Date.now() - new Date(recent.created_at).getTime()) / 1000)
                  : null;
                const msg = !recent
                  ? "No calls have been placed for this lead yet."
                  : ageSec < 300
                    ? "Transcript is still landing. Speechmatics typically takes 30-90s after the call ends — try again in a minute."
                    : candidates && candidates.length > 0
                      ? `Found ${candidates.length} call${candidates.length === 1 ? "" : "s"} but none have a usable transcript. Recordings may have been silent or transcription failed.`
                      : "The most recent call has no transcript. The recording may not have been captured.";
                setBrainToast({ type: "info", message: msg });
                setTimeout(() => setBrainToast(null), 6000);
              }}
            />
          ) : (
            <EmptyDetail />
          )}
        </div>
      </div>

      {brainToast && <BrainToast type={brainToast.type} message={brainToast.message} />}

      {verifyOpen && (
        <CallerIDVerificationModal
          onClose={() => setVerifyOpen(false)}
          onVerified={() => setVerifyOpen(false)}
        />
      )}

      {emailOpen && selected && (
        <FollowUpEmailModal
          lead={selected}
          prefilledDraft={draftsByLead[selected.id] || null}
          onClose={() => setEmailOpen(false)}
          onDiscard={async () => {
            const d = draftsByLead[selected.id];
            if (!d || !supabase) return;
            setDraftsByLead((prev) => {
              const next = { ...prev };
              delete next[selected.id];
              return next;
            });
            await supabase
              .from("email_drafts")
              .update({ status: "discarded" })
              .eq("id", d.id);
          }}
          onSent={() => {
            setEmailOpen(false);
            setDraftsByLead((prev) => {
              const next = { ...prev };
              delete next[selected.id];
              return next;
            });
            setLeads((prev) =>
              prev.map((l) =>
                l.id === selected.id && !["positive", "negative", "in_hubspot"].includes(l.status)
                  ? { ...l, status: "follow_up", updated_at: new Date().toISOString() }
                  : l
              )
            );
          }}
        />
      )}

      {transcriptOpen && selected && (
        <TranscriptPasteModal
          lead={selected}
          verticalId={selected?.vertical_id}
          onClose={() => setTranscriptOpen(false)}
          onIngested={() => {
            setBrainToast({ type: "transcript" });
            setTimeout(() => setBrainToast(null), 3200);
          }}
        />
      )}

      {editOpen && selected && (
        <EditLeadModal
          lead={selected}
          onClose={() => setEditOpen(false)}
          onSaved={(updated) => {
            setLeads((prev) =>
              prev.map((l) => (l.id === updated.id ? { ...l, ...updated } : l))
            );
            setEditOpen(false);
          }}
        />
      )}

      {addOpen && (
        <AddLeadModal
          defaultVerticalId={
            selectedVerticalIds && selectedVerticalIds.size === 1
              ? Array.from(selectedVerticalIds)[0]
              : null
          }
          onClose={() => setAddOpen(false)}
          onCreated={(newLead) => {
            // Make sure the new lead's vertical is included in the filter so
            // it actually appears in the list. Otherwise it'd be hidden.
            setSelectedVerticalIds((prev) => {
              const next = new Set(prev || []);
              next.add(newLead.vertical_id);
              return next;
            });
            setLeads((prev) => [newLead, ...prev]);
            setSelectedId(newLead.id);
            setStatusFilter("all");
            setAddOpen(false);
          }}
        />
      )}

      {reviewCall && selected && (
        <CallReviewModal
          call={reviewCall}
          lead={selected}
          onClose={() => setReviewCall(null)}
          onApplied={(updated) =>
            setLeads((prev) => prev.map((l) => (l.id === updated.id ? { ...l, ...updated } : l)))
          }
        />
      )}

      {sendToast && <SendToast {...sendToast} />}
    </AppShell>
  );
}

/* ────────────────────────── Filter bar ────────────────────────── */

function FilterBar({
  verticals,
  selectedVerticalIds,
  onToggleVertical,
  onClearVerticals,
  onSelectAllVerticals,
  statusFilter,
  setStatusFilter,
  search,
  setSearch,
  counts,
}) {
  return (
    <div className="bg-surface-container-low rounded-2xl editorial-shadow px-4 py-3 flex items-center gap-3 flex-wrap">
      <VerticalFilterDropdown
        verticals={verticals}
        selectedIds={selectedVerticalIds}
        onToggle={onToggleVertical}
        onClear={onClearVerticals}
        onSelectAll={onSelectAllVerticals}
      />

      <div className="flex items-center gap-1.5 flex-wrap">
        <FilterChip
          label="All"
          count={counts.all || 0}
          active={statusFilter === "all"}
          onClick={() => setStatusFilter("all")}
        />
        {VISIBLE_FILTER_STATUSES.map((s) => (
          <FilterChip
            key={s}
            label={STATUS_LABELS[s]}
            count={counts[s] || 0}
            active={statusFilter === s}
            onClick={() => setStatusFilter(s)}
          />
        ))}
      </div>

      <div className="flex-1 min-w-[200px] relative">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px] pointer-events-none">
          search
        </span>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, company, title…"
          className="w-full pl-9 pr-3 py-2 bg-surface-container-lowest border border-outline/15 rounded-xl text-sm font-label text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:border-on-surface/40 transition-colors"
        />
      </div>
    </div>
  );
}

function FilterChip({ label, count, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-label text-[12px] font-semibold tracking-tight transition-all ${
        active
          ? "bg-primary text-on-primary shadow-sm"
          : "bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
      }`}
    >
      {label}
      <span
        className={`tabular-nums text-[11px] font-bold ${active ? "text-on-primary/80" : "text-on-surface-variant/60"}`}
      >
        {count}
      </span>
    </button>
  );
}

/* ────────────────────────── Lead row ────────────────────────── */

const LeadRow = memo(function LeadRow({ lead, hasDraft, selected, onSelect }) {
  return (
    <button
      onClick={() => onSelect(lead.id)}
      className={`relative w-full text-left px-5 py-3.5 transition-all ${
        selected
          ? "bg-surface-container-high"
          : "hover:bg-surface-container/50"
      }`}
    >
      {selected && (
        <span
          className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-primary"
          aria-hidden="true"
        />
      )}
      <div className="flex items-start gap-3">
        <Avatar name={lead.name} hasDraft={hasDraft} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="font-headline font-semibold text-[13.5px] text-on-surface truncate tracking-tight">
                {lead.name || "Unknown"}
              </div>
              <div className="font-label text-[11.5px] text-on-surface-variant truncate mt-0.5">
                {lead.title || "—"}
              </div>
              <div className="font-label text-[11.5px] text-on-surface/90 font-medium truncate mt-0.5">
                {lead.company || "—"}
              </div>
            </div>
            <StatusBadge status={lead.status} />
          </div>
          {hasDraft && (
            <div className="mt-2 inline-flex items-center gap-1.5 font-label text-[10px] uppercase tracking-wider text-amber-700 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
              Draft ready
            </div>
          )}
        </div>
      </div>
    </button>
  );
});

function Avatar({ name, hasDraft }) {
  const initials = (name || "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("");
  return (
    <div className="relative shrink-0">
      <div className="w-9 h-9 rounded-full bg-surface-container-highest text-on-surface flex items-center justify-center font-headline font-bold text-[11px] tracking-wider">
        {initials || "?"}
      </div>
      {hasDraft && (
        <span
          className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-amber-500 ring-2 ring-surface-container-low flex items-center justify-center"
          aria-label="Draft ready"
        >
          <span
            className="material-symbols-outlined text-white"
            style={{ fontSize: "9px", fontVariationSettings: "'FILL' 1" }}
          >
            edit
          </span>
        </span>
      )}
    </div>
  );
}

function StatusBadge({ status }) {
  const palette = {
    new: "bg-surface-container-high text-on-surface-variant",
    called: "bg-blue-500/12 text-blue-700",
    positive: "bg-tertiary-container text-on-tertiary-container",
    callback: "bg-blue-500/12 text-blue-700",
    follow_up: "bg-amber-500/12 text-amber-700",
    negative: "bg-error-container text-on-error-container",
    gatekeeper: "bg-surface-container-high text-on-surface-variant",
    in_hubspot: "bg-primary text-on-primary",
  };
  return (
    <span
      className={`font-label text-[9.5px] uppercase tracking-wider px-2 py-0.5 rounded-full flex-shrink-0 font-bold ${
        palette[status] || palette.new
      }`}
    >
      {STATUS_LABELS[status] || status}
    </span>
  );
}

/* ────────────────────────── Lead detail ────────────────────────── */

function LeadDetail({
  lead,
  vertical,
  draft,
  sending,
  onSendDraftNow,
  onOutcome,
  onPushHubspot,
  onNeedsVerification,
  onSendEmail,
  onPasteTranscript,
  onEditLead,
  onLeadUpdated,
  onReviewLastCall,
  onDiscardDraft,
}) {
  return (
    <div className="bg-surface-container-low rounded-2xl editorial-shadow overflow-hidden animate-fade-up">
      {/* Hero header */}
      <div className="p-6 border-b border-outline/10">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-start gap-4 min-w-0">
            <div className="w-14 h-14 rounded-2xl metallic-silk flex items-center justify-center text-on-primary font-headline font-bold text-base tracking-wider shrink-0 shadow-md">
              {(lead.name || "?")
                .split(/\s+/)
                .filter(Boolean)
                .slice(0, 2)
                .map((p) => p[0].toUpperCase())
                .join("") || "?"}
            </div>
            <div className="min-w-0">
              <div className="font-headline font-extrabold text-2xl text-on-surface tracking-tight leading-tight">
                {lead.name || "Unknown"}
              </div>
              <div className="font-label text-sm text-on-surface-variant mt-0.5">
                {lead.title || "—"}
              </div>
              <div className="font-label text-sm text-on-surface font-medium">
                {lead.company || "—"}
              </div>
              {lead.location && (
                <div className="font-label text-xs text-on-surface-variant mt-1 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">place</span>
                  {lead.location}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onEditLead}
              title="Edit lead details"
              className="w-9 h-9 rounded-full hover:bg-surface-container-high flex items-center justify-center transition-colors"
              aria-label="Edit lead"
            >
              <span className="material-symbols-outlined text-on-surface-variant text-[18px]">
                edit
              </span>
            </button>
            <StatusBadge status={lead.status} />
          </div>
        </div>

        {/* Contact chips */}
        <div className="flex flex-wrap gap-2">
          {lead.phone && (
            <ContactChip icon="call" label={lead.phone} href={`tel:${lead.phone}`} />
          )}
          {lead.email && (
            <ContactChip icon="mail" label={lead.email} href={`mailto:${lead.email}`} />
          )}
          {lead.domain && (
            <ContactChip
              icon="language"
              label={lead.domain}
              href={lead.domain.startsWith("http") ? lead.domain : `https://${lead.domain}`}
              external
            />
          )}
        </div>
      </div>

      {/* Draft hero card (only when draft exists) */}
      {draft && (
        <div className="relative border-b border-outline/10 overflow-hidden">
          <div className="absolute inset-y-0 left-0 w-1 bg-amber-500" />
          <div className="pl-6 pr-5 py-5">
            <div className="flex items-center gap-2 mb-3">
              <span
                className="material-symbols-outlined text-amber-600 text-[18px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                edit_note
              </span>
              <div className="eyebrow text-amber-700">
                Agent draft ready — wrote this after the call
              </div>
            </div>
            <div className="font-headline font-bold text-base text-on-surface mb-1 tracking-tight">
              {draft.subject}
            </div>
            <div className="font-label text-[13px] text-on-surface-variant whitespace-pre-line mb-4 line-clamp-4 leading-relaxed">
              {draft.body}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={onSendDraftNow}
                disabled={sending || !lead.email}
                className="metallic-silk text-on-primary px-5 py-2.5 rounded-xl font-headline font-bold text-sm shadow-lg hover:-translate-y-px disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 transition-all flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">send</span>
                {sending ? "Sending…" : "Send now"}
              </button>
              <button
                onClick={onSendEmail}
                disabled={sending}
                className="px-4 py-2.5 rounded-xl font-label text-sm font-semibold border border-outline/30 text-on-surface hover:bg-surface-container-high disabled:opacity-50 transition-colors"
              >
                Review &amp; edit
              </button>
              <button
                onClick={onDiscardDraft}
                disabled={sending}
                className="ml-auto px-3 py-2.5 rounded-xl font-label text-sm font-medium text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface disabled:opacity-50 transition-colors inline-flex items-center gap-1.5"
                title="Discard this draft — won't auto-pop back open"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
                Don't send
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Make the call */}
      <div className="p-6 border-b border-outline/10">
        <div className="eyebrow text-on-surface-variant mb-3">Make the call</div>
        {lead.phone ? (
          <CallButton lead={lead} onNeedsVerification={onNeedsVerification} />
        ) : (
          <div className="font-label text-sm text-on-surface-variant flex items-center gap-2 py-2">
            <span className="material-symbols-outlined text-[16px]">phone_disabled</span>
            No phone on file. Send an email instead.
          </div>
        )}
      </div>

      {/* Tag the outcome */}
      <div className="p-6 border-b border-outline/10">
        <div className="flex items-center justify-between mb-3">
          <div className="eyebrow text-on-surface-variant">Tag the outcome</div>
          <div className="font-label text-[11px] text-on-surface-variant/70 flex items-center gap-1.5">
            Hotkeys
            <Kbd>1</Kbd>
            <Kbd>2</Kbd>
            <Kbd>3</Kbd>
            <Kbd>4</Kbd>
            <Kbd>5</Kbd>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {OUTCOMES.map((o) => (
            <OutcomeButton
              key={o.id}
              outcome={o}
              active={lead.status === o.id}
              onClick={() => onOutcome(o.id)}
            />
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="p-6">
        <div className="eyebrow text-on-surface-variant mb-3">Actions</div>
        <div className="flex items-center gap-2 flex-wrap">
          <ActionButton
            icon="send"
            label={draft ? "Edit & send email" : "Follow-up email"}
            onClick={onSendEmail}
            disabled={!lead.email}
          />
          <ActionButton
            icon="content_paste"
            label="Paste transcript"
            onClick={onPasteTranscript}
          />
          <ActionButton
            icon="rate_review"
            label="Review last call"
            onClick={onReviewLastCall}
          />
          <ActionButton
            icon="cloud_upload"
            label={lead.status === "in_hubspot" ? "Pushed to HubSpot" : "Push to HubSpot"}
            onClick={onPushHubspot}
            disabled={lead.status === "in_hubspot"}
          />
        </div>

        <div className="mt-6 space-y-4">
          <CoachPanel lead={lead} />
          <PostCallPanel lead={lead} />
        </div>

        <div className="space-y-4 mt-6">
          <LeadCRMPanel lead={lead} onUpdated={onLeadUpdated} />
          <ScriptCard lead={lead} verticalId={lead.vertical_id} vertical={vertical} />
        </div>

        <LeadBrainPanel lead={lead} />
      </div>
    </div>
  );
}

function ContactChip({ icon, label, href, external }) {
  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer" : undefined}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-lowest border border-outline/15 text-on-surface hover:bg-surface-container-high hover:border-outline/30 transition-colors font-label text-[12.5px] font-medium tracking-tight"
    >
      <span className="material-symbols-outlined text-[15px] text-on-surface-variant">{icon}</span>
      {label}
    </a>
  );
}

/* ────────────────────────── Outcome buttons ────────────────────────── */

function OutcomeButton({ outcome, active, onClick }) {
  const tones = {
    emerald: {
      active: "bg-tertiary text-on-tertiary border-tertiary",
      idle: "bg-tertiary-container/40 text-on-tertiary-container border-tertiary/30 hover:bg-tertiary-container/70",
    },
    indigo: {
      active: "bg-blue-600 text-white border-blue-600",
      idle: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100",
    },
    amber: {
      active: "bg-amber-500 text-white border-amber-500",
      idle: "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100",
    },
    rose: {
      active: "bg-error text-on-error border-error",
      idle: "bg-error-container/50 text-on-error-container border-error/20 hover:bg-error-container",
    },
    slate: {
      active: "bg-on-surface text-background border-on-surface",
      idle: "bg-surface-container-lowest text-on-surface-variant border-outline/20 hover:bg-surface-container-high",
    },
  };
  const tone = tones[outcome.color] || tones.slate;
  const cls = active ? tone.active : tone.idle;
  return (
    <button
      onClick={onClick}
      className={`group relative flex flex-col items-center gap-1 px-3 py-3 rounded-xl border font-label text-[12.5px] font-semibold transition-all duration-150 hover:-translate-y-px ${cls} ${
        active ? "shadow-md" : ""
      }`}
    >
      <span
        className="material-symbols-outlined text-[20px]"
        style={active ? { fontVariationSettings: "'FILL' 1" } : {}}
      >
        {outcome.icon}
      </span>
      <span className="text-center leading-tight">{outcome.label}</span>
      <span
        className={`absolute top-1.5 right-1.5 text-[9px] font-bold w-4 h-4 rounded flex items-center justify-center ${
          active ? "bg-white/25 text-white" : "bg-on-surface/10 text-on-surface-variant"
        }`}
      >
        {outcome.key}
      </span>
    </button>
  );
}

function ActionButton({ icon, label, onClick, href, disabled }) {
  const base =
    "inline-flex items-center gap-2 px-3.5 py-2 rounded-xl font-label text-sm font-semibold border transition-all";
  const cls = disabled
    ? `${base} bg-surface-container-highest/30 text-on-surface-variant/50 border-outline/10 cursor-not-allowed`
    : `${base} bg-surface-container-lowest text-on-surface border-outline/20 hover:bg-surface-container-high hover:border-outline/40 hover:-translate-y-px`;
  if (href && !disabled) {
    return (
      <a href={href} className={cls}>
        <span className="material-symbols-outlined text-[18px]">{icon}</span>
        {label}
      </a>
    );
  }
  return (
    <button onClick={onClick} disabled={disabled} className={cls}>
      <span className="material-symbols-outlined text-[18px]">{icon}</span>
      {label}
    </button>
  );
}

/* ────────────────────────── Toasts + empty states + Kbd ────────────────────────── */

function BrainToast({ type, message }) {
  const LABEL = {
    profile_chase: "Brain learned: chase profiles like this",
    profile_avoid: "Brain learned: avoid this profile",
    commitment_made: "Brain logged: commitment recorded",
    transcript: "Transcript ingested — brain updated",
    revert: "Outcome cleared — brain entry removed",
  };
  const isInfo = type === "info";
  return (
    <div className="fixed bottom-6 right-6 z-50 bg-inverse-surface text-inverse-on-surface px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 font-label text-sm font-medium animate-scale-in editorial-shadow-dark max-w-md">
      <span
        className="material-symbols-outlined text-[20px] text-primary-fixed"
        style={{ fontVariationSettings: "'FILL' 1" }}
      >
        {isInfo ? "info" : "psychology"}
      </span>
      <span>{message || LABEL[type] || "Brain updated"}</span>
      {!isInfo && (
        <Link
          href="/knowledge"
          className="ml-2 underline underline-offset-2 text-primary-fixed hover:text-primary-fixed-dim font-semibold"
        >
          View
        </Link>
      )}
    </div>
  );
}

function SendToast({ kind, text }) {
  const isSuccess = kind === "success";
  return (
    <div
      className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2 font-label text-sm font-medium animate-scale-in ${
        isSuccess
          ? "bg-tertiary text-on-tertiary"
          : "bg-error text-on-error"
      }`}
    >
      <span
        className="material-symbols-outlined text-[18px]"
        style={{ fontVariationSettings: "'FILL' 1" }}
      >
        {isSuccess ? "mark_email_read" : "error"}
      </span>
      {text}
    </div>
  );
}

function EmptyLeads() {
  return (
    <div className="px-6 py-10 text-center">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-surface-container-high mb-3">
        <span
          className="material-symbols-outlined text-on-surface-variant"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          groups
        </span>
      </div>
      <div className="font-headline font-bold text-sm text-on-surface mb-1">
        No leads match this filter
      </div>
      <div className="font-label text-xs text-on-surface-variant max-w-[26ch] mx-auto">
        Try a different status, clear the search, or{" "}
        <Link href="/intelligence" className="text-primary font-semibold underline">
          run the agent
        </Link>{" "}
        to source more.
      </div>
    </div>
  );
}

function EmptyDetail() {
  return (
    <div className="bg-surface-container-low rounded-2xl editorial-shadow p-12 text-center">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-surface-container-high mb-4">
        <span className="material-symbols-outlined text-on-surface-variant text-[28px]">
          ads_click
        </span>
      </div>
      <div className="font-headline font-bold text-base text-on-surface mb-1">
        Pick a lead to start working
      </div>
      <p className="font-label text-sm text-on-surface-variant max-w-md mx-auto">
        Click any name on the left. The hotkeys <Kbd>1</Kbd>–<Kbd>5</Kbd> will tag the selected lead's outcome.
      </p>
    </div>
  );
}

function Kbd({ children }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-[5px] bg-surface-container-high border border-outline/30 font-mono text-[10px] font-bold text-on-surface-variant shadow-[inset_0_-1px_0_rgba(0,0,0,0.04)]">
      {children}
    </kbd>
  );
}
