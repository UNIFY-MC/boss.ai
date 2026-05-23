"use client";

// /pipeline — Internal CRM kanban (B7).
// Each column is a pipeline_stage. Cards are leads. Drag a card to a new
// column → update lead.pipeline_stage + pipeline_stage_at.

import { useCallback, useEffect, useMemo, useState } from "react";
import AppShell from "../components/AppShell";
import PipelineLeadModal from "../components/PipelineLeadModal";
import VerticalFilterDropdown from "../components/VerticalFilterDropdown";
import { supabase } from "../lib/supabase";
import { useVerticals } from "../lib/hooks";

const STAGES = [
  { id: "new",           label: "New",          tone: "neutral" },
  { id: "contacted",     label: "Contacted",    tone: "blue" },
  { id: "qualified",     label: "Qualified",    tone: "indigo" },
  { id: "meeting_set",   label: "Meeting set",  tone: "tertiary" },
  { id: "demo",          label: "Demo",         tone: "tertiary" },
  { id: "negotiating",   label: "Negotiating",  tone: "amber" },
  { id: "closed_won",    label: "Closed won",   tone: "emerald" },
  { id: "closed_lost",   label: "Closed lost",  tone: "rose" },
];

const TONE_HEADER = {
  neutral:   "bg-surface-container-high text-on-surface",
  blue:      "bg-blue-100 text-blue-900",
  indigo:    "bg-indigo-100 text-indigo-900",
  tertiary:  "bg-tertiary-container text-on-tertiary-container",
  amber:     "bg-amber-100 text-amber-900",
  emerald:   "bg-tertiary-container text-on-tertiary-container",
  rose:      "bg-error-container text-on-error-container",
};

export default function PipelinePage() {
  return (
    <AppShell>
      <PipelineInner />
    </AppShell>
  );
}

function PipelineInner() {
  const { verticals } = useVerticals();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  // Multi-select. Explicit Set of included vertical IDs.
  // null = uninitialized (filled on first verticals load with everything).
  // empty Set = user cleared everything (no leads shown).
  // full Set = all verticals included.
  const [selectedVerticalIds, setSelectedVerticalIds] = useState(null);
  const [hideClosed, setHideClosed] = useState(false);
  const [dragLeadId, setDragLeadId] = useState(null);
  const [overStage, setOverStage] = useState(null);
  const [openLeadId, setOpenLeadId] = useState(null);

  // Initialize the filter set with all verticals the first time they load
  useEffect(() => {
    if (selectedVerticalIds === null && verticals.length > 0) {
      setSelectedVerticalIds(new Set(verticals.map((v) => v.id)));
    }
  }, [verticals, selectedVerticalIds]);

  const fetchLeads = useCallback(async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    // Don't query until the filter set has been initialized — avoids a
    // flicker of "all leads" before the filter applies on first load.
    if (selectedVerticalIds === null) return;
    if (selectedVerticalIds.size === 0) {
      setLeads([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("leads")
      .select(
        "id, vertical_id, name, title, company, deal_value_usd, next_action, next_action_due, pipeline_stage, pipeline_stage_at, status, pain_level, updated_at",
      )
      .in("vertical_id", Array.from(selectedVerticalIds))
      .order("pipeline_stage_at", { ascending: false })
      .limit(500);
    setLeads(data || []);
    setLoading(false);
  }, [selectedVerticalIds]);

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

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // Bucket leads by stage
  const byStage = useMemo(() => {
    const m = {};
    for (const s of STAGES) m[s.id] = [];
    for (const l of leads) {
      const k = l.pipeline_stage || "new";
      (m[k] = m[k] || []).push(l);
    }
    return m;
  }, [leads]);

  const totalValueByStage = useMemo(() => {
    const m = {};
    for (const s of STAGES) {
      m[s.id] = (byStage[s.id] || []).reduce(
        (acc, l) => acc + (Number(l.deal_value_usd) || 0),
        0,
      );
    }
    return m;
  }, [byStage]);

  const handleDrop = async (leadId, targetStage) => {
    if (!leadId || !targetStage) return;
    const lead = leads.find((l) => l.id === leadId);
    if (!lead || lead.pipeline_stage === targetStage) return;
    // Optimistic
    setLeads((prev) =>
      prev.map((l) =>
        l.id === leadId
          ? {
              ...l,
              pipeline_stage: targetStage,
              pipeline_stage_at: new Date().toISOString(),
            }
          : l,
      ),
    );
    if (supabase) {
      await supabase
        .from("leads")
        .update({
          pipeline_stage: targetStage,
          pipeline_stage_at: new Date().toISOString(),
        })
        .eq("id", leadId);
    }
  };

  const visibleStages = hideClosed
    ? STAGES.filter((s) => !s.id.startsWith("closed_"))
    : STAGES;

  return (
    <>
      <div className="mb-6 flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="eyebrow text-on-surface-variant/70 mb-1">CRM</div>
          <h1 className="display-1 text-on-surface" style={{ fontSize: "2.25rem" }}>
            Pipeline
          </h1>
          <p className="font-label text-sm text-on-surface-variant mt-1 max-w-2xl">
            Drag leads as deals move. Each column is a stage; cards are people.
            Outcomes from calls auto-move cards.
          </p>
        </div>
        <label className="inline-flex items-center gap-1.5 font-label text-xs text-on-surface-variant shrink-0">
          <input
            type="checkbox"
            checked={hideClosed}
            onChange={(e) => setHideClosed(e.target.checked)}
            className="accent-on-surface"
          />
          Hide closed
        </label>
      </div>

      {/* Vertical multi-select dropdown */}
      <div className="mb-5">
        <VerticalFilterDropdown
          verticals={verticals}
          selectedIds={selectedVerticalIds}
          onToggle={toggleVertical}
          onClear={clearVerticalFilter}
          onSelectAll={selectAllVerticals}
        />
      </div>

      {/* Kanban — horizontal scroll on narrow screens. Subtle scrollbar
          so it doesn't read as a black line beneath the board. */}
      <div
        className="overflow-x-auto -mx-4 md:-mx-8 px-4 md:px-8 pb-2"
        style={{
          scrollbarWidth: "thin",
          scrollbarColor: "rgba(31,22,18,0.15) transparent",
        }}
      >
        <div className="flex gap-4 min-w-max">
          {visibleStages.map((stage) => {
            const cards = byStage[stage.id] || [];
            const total = totalValueByStage[stage.id] || 0;
            const isOver = overStage === stage.id && dragLeadId;
            return (
              <div
                key={stage.id}
                className={`w-72 shrink-0 rounded-2xl bg-surface-container-low/50 border border-outline/10 transition-colors ${
                  isOver ? "ring-2 ring-primary/40 bg-surface-container-low" : ""
                }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (overStage !== stage.id) setOverStage(stage.id);
                }}
                onDragLeave={() => {
                  if (overStage === stage.id) setOverStage(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  handleDrop(dragLeadId, stage.id);
                  setDragLeadId(null);
                  setOverStage(null);
                }}
              >
                <div className={`px-4 py-2.5 rounded-t-2xl ${TONE_HEADER[stage.tone]}`}>
                  <div className="flex items-center justify-between">
                    <div className="font-headline font-extrabold text-[13px] tracking-tight">
                      {stage.label}
                    </div>
                    <div className="font-label text-[11px] tabular-nums opacity-80">
                      {cards.length}
                    </div>
                  </div>
                  {total > 0 && (
                    <div className="font-label text-[11px] tabular-nums opacity-80 mt-0.5">
                      ${total.toLocaleString()}
                    </div>
                  )}
                </div>
                <div className="p-2 space-y-2 min-h-[200px]">
                  {loading
                    ? [1, 2].map((i) => <div key={i} className="skeleton h-20 rounded-xl" />)
                    : cards.length === 0
                      ? (
                          <div className="flex flex-col items-center justify-center py-8 px-3 text-center">
                            <span
                              className="material-symbols-outlined text-on-surface-variant/30 text-[22px] mb-1.5"
                              style={{ fontVariationSettings: "'FILL' 1" }}
                            >
                              drag_indicator
                            </span>
                            <div className="font-label text-[11px] text-on-surface-variant/60 leading-snug max-w-[20ch]">
                              Drop a card here
                            </div>
                          </div>
                        )
                      : cards.map((lead) => (
                          <LeadCard
                            key={lead.id}
                            lead={lead}
                            onClick={() => setOpenLeadId(lead.id)}
                            onDragStart={() => setDragLeadId(lead.id)}
                            onDragEnd={() => {
                              setDragLeadId(null);
                              setOverStage(null);
                            }}
                            dragging={dragLeadId === lead.id}
                          />
                        ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {openLeadId && (
        <PipelineLeadModal
          leadId={openLeadId}
          onClose={() => setOpenLeadId(null)}
          onUpdated={(updated) =>
            setLeads((prev) => prev.map((l) => (l.id === updated.id ? { ...l, ...updated } : l)))
          }
        />
      )}
    </>
  );
}

function LeadCard({ lead, onClick, onDragStart, onDragEnd, dragging }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onClick?.();
      }}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`block p-3 rounded-xl bg-surface-container-lowest border border-outline/15 hover:border-outline/30 hover:shadow-sm transition-all cursor-grab active:cursor-grabbing ${
        dragging ? "opacity-40" : ""
      }`}
    >
      <div className="font-headline font-bold text-[13.5px] text-on-surface truncate">
        {lead.name || "(unnamed)"}
      </div>
      <div className="font-label text-[11.5px] text-on-surface-variant truncate mt-0.5">
        {lead.title ? `${lead.title} · ` : ""}{lead.company || ""}
      </div>
      {(lead.deal_value_usd || lead.next_action_due) && (
        <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-outline/10">
          {lead.deal_value_usd && (
            <div className="font-label text-[11px] tabular-nums text-on-surface font-bold">
              ${Number(lead.deal_value_usd).toLocaleString()}
            </div>
          )}
          {lead.next_action_due && (
            <div className="font-label text-[10.5px] text-on-surface-variant ml-auto">
              Due {new Date(lead.next_action_due).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
            </div>
          )}
        </div>
      )}
      {lead.next_action && (
        <div className="font-label text-[11px] text-on-surface-variant mt-1.5 leading-snug line-clamp-2">
          → {lead.next_action}
        </div>
      )}
    </div>
  );
}
