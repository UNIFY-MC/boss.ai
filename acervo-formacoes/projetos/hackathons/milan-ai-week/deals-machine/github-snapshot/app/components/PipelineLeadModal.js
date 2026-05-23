"use client";
// PipelineLeadModal — full contact card opened from the kanban.
//
// Shows everything that matters about this lead in one place:
//   - Contact details (editable inline)
//   - CRM block (stage, $, next action, due)
//   - Notes (memory_summary)
//   - Recent calls (last 5)
//   - Brain entries for this lead (top 10)
//
// Saves on blur; no separate save button.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/app/lib/supabase";
import { timeAgo } from "@/app/lib/format";
import { useToast } from "./Toast";
import EmptyState from "./EmptyState";

const STAGE_LABELS = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  meeting_set: "Meeting set",
  demo: "Demo",
  negotiating: "Negotiating",
  closed_won: "Closed won",
  closed_lost: "Closed lost",
};

const STAGES = [
  { id: "new",          label: "New" },
  { id: "contacted",    label: "Contacted" },
  { id: "qualified",    label: "Qualified" },
  { id: "meeting_set",  label: "Meeting set" },
  { id: "demo",         label: "Demo" },
  { id: "negotiating",  label: "Negotiating" },
  { id: "closed_won",   label: "Closed won" },
  { id: "closed_lost",  label: "Closed lost" },
];

const STAGE_TONE = {
  new:         "bg-surface-container-high text-on-surface",
  contacted:   "bg-blue-100 text-blue-900",
  qualified:   "bg-indigo-100 text-indigo-900",
  meeting_set: "bg-tertiary-container text-on-tertiary-container",
  demo:        "bg-tertiary-container text-on-tertiary-container",
  negotiating: "bg-amber-100 text-amber-900",
  closed_won:  "bg-tertiary-container text-on-tertiary-container",
  closed_lost: "bg-error-container text-on-error-container",
};

export default function PipelineLeadModal({ leadId, onClose, onUpdated }) {
  const [lead, setLead] = useState(null);
  const [calls, setCalls] = useState([]);
  const [brainEntries, setBrainEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  // Load lead + calls + brain entries
  useEffect(() => {
    if (!leadId || !supabase) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const [leadRes, callsRes, brainRes] = await Promise.all([
        supabase
          .from("leads")
          .select(
            "id, vertical_id, name, title, company, location, phone, email, domain, status, memory_summary, deal_value_usd, next_action, next_action_due, pipeline_stage, pipeline_stage_at, trigger_event, account_id, created_at, updated_at",
          )
          .eq("id", leadId)
          .single(),
        supabase
          .from("calls")
          .select("id, status, outcome_signal, recording_duration_seconds, created_at, ended_at")
          .eq("lead_id", leadId)
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("brain_entries")
          .select("id, type, content, evidence_quote, weight, source, created_at")
          .eq("lead_id", leadId)
          .order("created_at", { ascending: false })
          .limit(10),
      ]);
      if (cancelled) return;
      setLead(leadRes.data);
      setCalls(callsRes.data || []);
      setBrainEntries(brainRes.data || []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [leadId]);

  const updateField = useCallback(
    async (patch) => {
      if (!lead?.id) return;
      setSaving(true);
      const stageChanged = patch.pipeline_stage && patch.pipeline_stage !== lead.pipeline_stage;
      const fullPatch = {
        ...patch,
        ...(stageChanged ? { pipeline_stage_at: new Date().toISOString() } : {}),
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase.from("leads").update(fullPatch).eq("id", lead.id);
      setSaving(false);
      if (error) {
        toast.error("Couldn't save", { detail: error.message });
        return;
      }
      const next = { ...lead, ...fullPatch };
      setLead(next);
      onUpdated?.(next);
      if (stageChanged) {
        toast.success("Stage updated", { detail: STAGE_LABELS[patch.pipeline_stage] || patch.pipeline_stage });
      } else {
        toast.success("Saved");
      }
    },
    [lead, onUpdated, toast],
  );

  if (!leadId) return null;

  return (
    <>
      {/* Backdrop pinned to viewport so it stays put while the modal scrolls */}
      <div
        className="fixed inset-0 z-50 bg-on-surface/40 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-20 overflow-y-auto pointer-events-none">
      <div className="glass-panel relative w-full max-w-4xl rounded-3xl editorial-shadow-lg animate-scale-in mb-20 pointer-events-auto">
        {/* Header */}
        <div className="px-7 pt-6 pb-5 border-b border-outline/10 flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 min-w-0">
            <div className="w-14 h-14 rounded-2xl metallic-silk flex items-center justify-center text-on-primary font-headline font-bold text-base shrink-0 shadow-md">
              {(lead?.name || "?")
                .split(/\s+/)
                .filter(Boolean)
                .slice(0, 2)
                .map((p) => p[0].toUpperCase())
                .join("") || "?"}
            </div>
            <div className="min-w-0">
              <div className="eyebrow text-on-surface-variant mb-1">Contact</div>
              <div className="font-headline text-2xl font-extrabold text-on-surface tracking-tight">
                {lead?.name || "Loading…"}
              </div>
              <div className="font-label text-sm text-on-surface-variant">
                {lead?.title || "—"}{lead?.company ? ` · ${lead.company}` : ""}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {lead && (
              <Link
                href={`/leads?lead=${lead.id}`}
                className="px-3 py-2 rounded-xl font-headline text-[12.5px] font-bold text-on-surface bg-surface-container-lowest border border-outline/15 hover:bg-surface-container hover:border-outline/30 transition-all inline-flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                Open full lead
              </Link>
            )}
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full hover:bg-surface-container-high flex items-center justify-center transition-colors"
              aria-label="Close"
            >
              <span className="material-symbols-outlined text-on-surface-variant text-[20px]">close</span>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-7 space-y-5">
          {loading ? (
            <div className="space-y-3">
              <div className="skeleton h-20" />
              <div className="skeleton h-32" />
              <div className="skeleton h-40" />
            </div>
          ) : (
            <>
              {/* CRM strip */}
              <div className="rounded-2xl border border-outline/15 bg-surface-container-lowest/60 px-4 py-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="eyebrow text-on-surface-variant/70">CRM</span>
                  {saving && (
                    <span className="font-label text-[10px] text-on-surface-variant/60 inline-flex items-center gap-1">
                      <span className="material-symbols-outlined text-[12px] animate-spin">progress_activity</span>
                      saving
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <select
                    value={lead.pipeline_stage || "new"}
                    onChange={(e) => updateField({ pipeline_stage: e.target.value })}
                    className={`px-3 py-2 rounded-lg font-label text-[12.5px] font-bold border border-outline/15 focus:outline-none cursor-pointer ${STAGE_TONE[lead.pipeline_stage] || STAGE_TONE.new}`}
                  >
                    {STAGES.map((s) => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </select>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-label text-[12.5px] text-on-surface-variant pointer-events-none">$</span>
                    <input
                      type="number"
                      defaultValue={lead.deal_value_usd ?? ""}
                      placeholder="0"
                      onBlur={(e) => updateField({ deal_value_usd: e.target.value === "" ? null : Number(e.target.value) })}
                      className="w-28 pl-6 pr-3 py-2 rounded-lg border border-outline/15 bg-surface-container-lowest focus:outline-none focus:border-on-surface/40 font-label text-[13px]"
                    />
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <input
                      type="text"
                      defaultValue={lead.next_action ?? ""}
                      placeholder="Next action"
                      onBlur={(e) => updateField({ next_action: e.target.value.trim() || null })}
                      className="w-full px-3 py-2 rounded-lg border border-outline/15 bg-surface-container-lowest focus:outline-none focus:border-on-surface/40 font-label text-[13px]"
                    />
                  </div>
                  <input
                    type="date"
                    defaultValue={lead.next_action_due || ""}
                    onBlur={(e) => updateField({ next_action_due: e.target.value || null })}
                    className="px-3 py-2 rounded-lg border border-outline/15 bg-surface-container-lowest focus:outline-none focus:border-on-surface/40 font-label text-[13px]"
                  />
                </div>
              </div>

              {/* Contact details — editable inline */}
              <div className="rounded-2xl border border-outline/15 bg-surface-container-lowest/60 px-4 py-4">
                <div className="eyebrow text-on-surface-variant/70 mb-3">Details</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <DetailField label="Name" value={lead.name} onCommit={(v) => updateField({ name: v.trim() || null })} />
                  <DetailField label="Title" value={lead.title} onCommit={(v) => updateField({ title: v.trim() || null })} />
                  <DetailField label="Company" value={lead.company} onCommit={(v) => updateField({ company: v.trim() || null })} />
                  <DetailField label="Location" value={lead.location} onCommit={(v) => updateField({ location: v.trim() || null })} />
                  <DetailField label="Phone" value={lead.phone} onCommit={(v) => updateField({ phone: v.trim() || null })} type="tel" />
                  <DetailField label="Email" value={lead.email} onCommit={(v) => updateField({ email: v.trim() || null })} type="email" />
                  <DetailField label="Domain" value={lead.domain} onCommit={(v) => updateField({ domain: v.trim() || null })} />
                  <DetailField label="Trigger event" value={lead.trigger_event} onCommit={(v) => updateField({ trigger_event: v.trim() || null })} />
                </div>
              </div>

              {/* Notes */}
              <div className="rounded-2xl border border-outline/15 bg-surface-container-lowest/60 px-4 py-4">
                <div className="eyebrow text-on-surface-variant/70 mb-3">Notes</div>
                <textarea
                  defaultValue={lead.memory_summary ?? ""}
                  rows={4}
                  placeholder="What the brain knows about this lead. Captured from calls + outcomes."
                  onBlur={(e) => updateField({ memory_summary: e.target.value.trim() || null })}
                  className="w-full px-3 py-2 rounded-lg border border-outline/15 bg-surface-container-lowest focus:outline-none focus:border-on-surface/40 font-label text-[13.5px] leading-relaxed resize-y"
                />
              </div>

              {/* History — calls + brain entries */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-outline/15 bg-surface-container-lowest/60 px-4 py-4">
                  <div className="eyebrow text-on-surface-variant/70 mb-3">Call history · {calls.length}</div>
                  {calls.length === 0 ? (
                    <EmptyState
                      size="sm"
                      icon="call"
                      title="No calls yet"
                      body="Dial this lead and the call will appear here with outcome + duration."
                    />
                  ) : (
                    <ul className="space-y-2">
                      {calls.map((c) => (
                        <li key={c.id} className="flex items-center gap-2 font-label text-[12.5px] text-on-surface">
                          <span className="material-symbols-outlined text-[14px] text-on-surface-variant">phone</span>
                          <span className="text-on-surface-variant tabular-nums">
                            {timeAgo(c.created_at)}
                          </span>
                          <span>·</span>
                          <span className="font-medium">{c.outcome_signal || c.status || "—"}</span>
                          {c.recording_duration_seconds && (
                            <span className="text-on-surface-variant tabular-nums ml-auto">
                              {Math.floor(c.recording_duration_seconds / 60)}m {c.recording_duration_seconds % 60}s
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="rounded-2xl border border-outline/15 bg-surface-container-lowest/60 px-4 py-4">
                  <div className="eyebrow text-on-surface-variant/70 mb-3">Brain · {brainEntries.length}</div>
                  {brainEntries.length === 0 ? (
                    <EmptyState
                      size="sm"
                      icon="psychology"
                      title="No insights yet"
                      body="The brain writes here after the first call gets transcribed and tagged."
                    />
                  ) : (
                    <ul className="space-y-2 max-h-[260px] overflow-y-auto">
                      {brainEntries.map((b) => (
                        <li key={b.id} className="rounded-lg bg-surface-container-low/50 border border-outline/10 px-3 py-2">
                          <div className="font-label text-[10.5px] uppercase tracking-wider font-bold text-on-surface-variant mb-0.5">
                            {b.type.replace(/_/g, " ")}
                          </div>
                          <div className="font-label text-[12.5px] text-on-surface leading-snug">{b.content}</div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      </div>
    </>
  );
}

function DetailField({ label, value, onCommit, type = "text" }) {
  return (
    <div>
      <label className="font-label text-[10.5px] uppercase tracking-wider text-on-surface-variant/70 mb-1 block">
        {label}
      </label>
      <input
        type={type}
        defaultValue={value ?? ""}
        onBlur={(e) => onCommit(e.target.value)}
        className="w-full px-3 py-2 rounded-lg border border-outline/15 bg-surface-container-lowest focus:outline-none focus:border-on-surface/40 font-label text-[13px]"
      />
    </div>
  );
}
