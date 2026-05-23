"use client";
// LeadCRMPanel — horizontal CRM strip on a lead's detail card.
// One row: pipeline stage · deal value · next action (flex-1) · due date.
// Each field is inline-editable.

import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabase";
import { useToast } from "./Toast";

const STAGES = [
  { id: "new",           label: "New" },
  { id: "contacted",     label: "Contacted" },
  { id: "qualified",     label: "Qualified" },
  { id: "meeting_set",   label: "Meeting set" },
  { id: "demo",          label: "Demo" },
  { id: "negotiating",   label: "Negotiating" },
  { id: "closed_won",    label: "Closed won" },
  { id: "closed_lost",   label: "Closed lost" },
];

const STAGE_TONE = {
  new:          "bg-surface-container-high text-on-surface",
  contacted:    "bg-blue-100 text-blue-900",
  qualified:    "bg-indigo-100 text-indigo-900",
  meeting_set:  "bg-tertiary-container text-on-tertiary-container",
  demo:         "bg-tertiary-container text-on-tertiary-container",
  negotiating:  "bg-amber-100 text-amber-900",
  closed_won:   "bg-tertiary-container text-on-tertiary-container",
  closed_lost:  "bg-error-container text-on-error-container",
};

export default function LeadCRMPanel({ lead, onUpdated }) {
  const [draft, setDraft] = useState({
    pipeline_stage: lead?.pipeline_stage ?? "new",
    deal_value_usd: lead?.deal_value_usd ?? "",
    next_action: lead?.next_action ?? "",
    next_action_due: lead?.next_action_due ?? "",
  });
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    setDraft({
      pipeline_stage: lead?.pipeline_stage ?? "new",
      deal_value_usd: lead?.deal_value_usd ?? "",
      next_action: lead?.next_action ?? "",
      next_action_due: lead?.next_action_due ?? "",
    });
  }, [lead?.id, lead?.pipeline_stage, lead?.deal_value_usd, lead?.next_action, lead?.next_action_due]);

  const persist = async (patch) => {
    if (!lead?.id || !supabase) return;
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
    onUpdated?.({ ...lead, ...fullPatch });
    if (stageChanged) {
      const label = STAGES.find((s) => s.id === patch.pipeline_stage)?.label || patch.pipeline_stage;
      toast.success("Stage updated", { detail: label });
    } else {
      toast.success("Saved");
    }
  };

  return (
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
        {/* Stage */}
        <div className="shrink-0">
          <select
            value={draft.pipeline_stage}
            onChange={(e) => {
              const v = e.target.value;
              setDraft((d) => ({ ...d, pipeline_stage: v }));
              persist({ pipeline_stage: v });
            }}
            className={`px-3 py-2 rounded-lg font-label text-[12.5px] font-bold border border-outline/15 focus:outline-none cursor-pointer ${STAGE_TONE[draft.pipeline_stage] || STAGE_TONE.new}`}
          >
            {STAGES.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </div>

        {/* Deal value */}
        <div className="shrink-0 relative">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-label text-[12.5px] text-on-surface-variant pointer-events-none">$</span>
          <input
            type="number"
            value={draft.deal_value_usd}
            placeholder="0"
            onChange={(e) => setDraft((d) => ({ ...d, deal_value_usd: e.target.value }))}
            onBlur={(e) => persist({ deal_value_usd: e.target.value === "" ? null : Number(e.target.value) })}
            className="w-28 pl-6 pr-3 py-2 rounded-lg border border-outline/15 bg-surface-container-lowest focus:outline-none focus:border-on-surface/40 font-label text-[13px]"
          />
        </div>

        {/* Next action — takes the remaining space */}
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            value={draft.next_action}
            placeholder="Next action — e.g. Follow up Tuesday after demo"
            onChange={(e) => setDraft((d) => ({ ...d, next_action: e.target.value }))}
            onBlur={(e) => persist({ next_action: e.target.value.trim() || null })}
            className="w-full px-3 py-2 rounded-lg border border-outline/15 bg-surface-container-lowest focus:outline-none focus:border-on-surface/40 font-label text-[13px]"
          />
        </div>

        {/* Due date */}
        <div className="shrink-0">
          <input
            type="date"
            value={draft.next_action_due || ""}
            onChange={(e) => setDraft((d) => ({ ...d, next_action_due: e.target.value }))}
            onBlur={(e) => persist({ next_action_due: e.target.value || null })}
            className="px-3 py-2 rounded-lg border border-outline/15 bg-surface-container-lowest focus:outline-none focus:border-on-surface/40 font-label text-[13px]"
          />
        </div>
      </div>
    </div>
  );
}
