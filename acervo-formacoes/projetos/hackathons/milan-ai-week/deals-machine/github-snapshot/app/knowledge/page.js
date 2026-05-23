"use client";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import AppShell from "../components/AppShell";
import UploadDocumentModal from "../components/UploadDocumentModal";
import { useToast } from "../components/Toast";
import { supabase } from "../lib/supabase";
import { timeAgo as sharedTimeAgo } from "../lib/format";
import { useVerticals } from "../lib/hooks";

const TAB_ORDER_LS_KEY = "dm.knowledge.vertical-tab-order";

const TYPES = [
  { id: "angle_landed",        label: "Landed angles",       icon: "trending_up",  tone: "emerald" },
  { id: "angle_failed",        label: "Failed angles",       icon: "trending_down", tone: "rose" },
  { id: "objection_recurring", label: "Recurring objections", icon: "report",       tone: "amber" },
  { id: "commitment_made",     label: "Commitments",         icon: "handshake",    tone: "indigo" },
  { id: "deal_killer",         label: "Deal killers",        icon: "dangerous",    tone: "rose" },
  { id: "profile_chase",       label: "Profiles to chase",   icon: "my_location",  tone: "emerald" },
  { id: "profile_avoid",       label: "Profiles to avoid",   icon: "block",        tone: "rose" },
  { id: "manual_insight",      label: "Manual insights",     icon: "edit_note",    tone: "neutral" },
];

const TONE = {
  emerald: "bg-tertiary-container/40 text-on-tertiary-container border-tertiary/30",
  rose:    "bg-error-container/40 text-on-error-container border-error/20",
  amber:   "bg-amber-500/10 text-amber-800 border-amber-500/30",
  indigo:  "bg-blue-500/10 text-blue-700 border-blue-200",
  neutral: "bg-surface-container-lowest text-on-surface border-outline/15",
};

const SOURCES = ["transcript", "brain", "manual", "document"];

export default function KnowledgePage() {
  return (
    <Suspense
      fallback={
        <AppShell>
          <div className="text-on-surface-variant text-sm py-12 text-center">Loading…</div>
        </AppShell>
      }
    >
      <KnowledgePageInner />
    </Suspense>
  );
}

function KnowledgePageInner() {
  const params = useSearchParams();
  const initialVertical = params?.get("vertical") || null;
  const { verticals } = useVerticals();
  const [verticalSlug, setVerticalSlug] = useState(initialVertical);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("all");
  const [filterSource, setFilterSource] = useState("all");
  const [addOpen, setAddOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);

  const activeVertical = useMemo(
    () => verticals.find((v) => v.slug === verticalSlug),
    [verticals, verticalSlug]
  );

  // Load ALL brain entries once. Filtering by vertical / type / source
  // happens client-side so counts stay accurate across tabs and chips
  // regardless of which subset the operator is currently viewing.
  const fetchEntries = async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("brain_entries")
      .select(
        "id, vertical_id, type, content, evidence_quote, weight, source, source_ref, lead_id, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(1000);
    setEntries(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchEntries();
  }, []);

  // What we render in the body — entries the active vertical owns, after
  // type + source chips apply.
  const filtered = useMemo(() => {
    let out = entries;
    if (activeVertical) out = out.filter((e) => e.vertical_id === activeVertical.id);
    if (filterType !== "all") out = out.filter((e) => e.type === filterType);
    if (filterSource !== "all") out = out.filter((e) => e.source === filterSource);
    return out;
  }, [entries, activeVertical, filterType, filterSource]);

  const grouped = useMemo(() => {
    const g = {};
    for (const e of filtered) {
      const v = verticals.find((x) => x.id === e.vertical_id);
      const key = v?.display_name || "(orphaned)";
      (g[key] = g[key] || []).push(e);
    }
    return g;
  }, [filtered, verticals]);

  // Source-chip counts respect the active vertical so "Brain · 3" reflects
  // how many brain-source entries this vertical has.
  const counts = useMemo(() => {
    const scope = activeVertical
      ? entries.filter((e) => e.vertical_id === activeVertical.id)
      : entries;
    const c = { all: scope.length, transcript: 0, brain: 0, manual: 0, document: 0 };
    for (const e of scope) {
      if (e.source) c[e.source] = (c[e.source] || 0) + 1;
    }
    return c;
  }, [entries, activeVertical]);

  // Per-vertical tab counts are computed from the FULL entries set with
  // type + source chips applied. So every tab shows how many entries IT
  // would have under the current filters, not how many remain after the
  // current vertical filter narrowed things down.
  const verticalCounts = useMemo(() => {
    const typeSourceFiltered = entries.filter((e) => {
      if (filterType !== "all" && e.type !== filterType) return false;
      if (filterSource !== "all" && e.source !== filterSource) return false;
      return true;
    });
    const c = { all: typeSourceFiltered.length };
    for (const v of verticals) c[v.slug] = 0;
    for (const e of typeSourceFiltered) {
      const v = verticals.find((vv) => vv.id === e.vertical_id);
      if (v) c[v.slug] = (c[v.slug] || 0) + 1;
    }
    return c;
  }, [entries, verticals, filterType, filterSource]);

  // Tab order — persisted in localStorage so drag-reorder survives reloads.
  // New verticals (not yet in the saved order) get appended at the end.
  const [tabOrder, setTabOrder] = useState([]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(TAB_ORDER_LS_KEY);
      if (raw) setTabOrder(JSON.parse(raw));
    } catch {}
  }, []);
  const orderedVerticals = useMemo(() => {
    const slugs = verticals.map((v) => v.slug);
    const known = tabOrder.filter((s) => slugs.includes(s));
    const unknown = slugs.filter((s) => !known.includes(s));
    const finalOrder = [...known, ...unknown];
    return finalOrder
      .map((slug) => verticals.find((v) => v.slug === slug))
      .filter(Boolean);
  }, [verticals, tabOrder]);
  const reorderTabs = (fromSlug, toSlug) => {
    if (!fromSlug || !toSlug || fromSlug === toSlug) return;
    const current = orderedVerticals.map((v) => v.slug);
    const fromIdx = current.indexOf(fromSlug);
    const toIdx = current.indexOf(toSlug);
    if (fromIdx === -1 || toIdx === -1) return;
    const next = [...current];
    next.splice(fromIdx, 1);
    next.splice(toIdx, 0, fromSlug);
    setTabOrder(next);
    try { localStorage.setItem(TAB_ORDER_LS_KEY, JSON.stringify(next)); } catch {}
  };

  return (
    <AppShell>
      <div className="mb-6 flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="eyebrow text-on-surface-variant/70 mb-1">The brain</div>
          <h1 className="display-1 text-on-surface" style={{ fontSize: "2.25rem" }}>
            Knowledge
          </h1>
          <p className="font-label text-sm text-on-surface-variant mt-1 max-w-2xl">
            What the agent learned. Powers every consequence chain, every script,
            every follow-up. Add yours or drop in a playbook — the brain absorbs it.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setUploadOpen(true)}
            className="px-4 py-2.5 rounded-2xl font-headline font-bold text-sm border border-outline/20 bg-surface-container-lowest text-on-surface hover:bg-surface-container-high hover:-translate-y-px transition-all flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">upload_file</span>
            Upload document
          </button>
          <button
            onClick={() => setAddOpen(true)}
            className="metallic-silk gleam-hover text-on-primary px-5 py-2.5 rounded-2xl font-headline font-bold text-sm shadow-lg hover:-translate-y-px hover:shadow-xl transition-all flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[20px]">add_circle</span>
            Add insight
          </button>
        </div>
      </div>

      {/* Vertical tab row — Chrome-style overlapping tabs, drag-to-reorder */}
      <VerticalTabBar
        verticals={orderedVerticals}
        counts={verticalCounts}
        activeSlug={verticalSlug}
        onSelect={setVerticalSlug}
        onReorder={reorderTabs}
      />

      {/* Type + source chip bar — counts scoped to the active vertical so
          the chips reflect what's actually filterable in the current view */}
      <div className="bg-surface-container-low rounded-2xl editorial-shadow p-4 mb-5 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Chip
            label="All types"
            count={counts.all}
            active={filterType === "all"}
            onClick={() => setFilterType("all")}
          />
          {TYPES.map((t) => {
            const scope = activeVertical
              ? entries.filter((e) => e.vertical_id === activeVertical.id)
              : entries;
            const c = scope.filter((e) => e.type === t.id).length;
            if (c === 0 && filterType !== t.id) return null;
            return (
              <Chip
                key={t.id}
                label={t.label}
                count={c}
                active={filterType === t.id}
                onClick={() => setFilterType(t.id)}
              />
            );
          })}
        </div>

        <div className="ml-auto flex items-center gap-1">
          <span className="eyebrow text-on-surface-variant/70 mr-1.5">Source</span>
          <SourceChip
            label="all"
            count={counts.all}
            active={filterSource === "all"}
            onClick={() => setFilterSource("all")}
          />
          {SOURCES.map((s) => (
            <SourceChip
              key={s}
              label={s}
              count={counts[s] || 0}
              active={filterSource === s}
              onClick={() => setFilterSource(s)}
            />
          ))}
        </div>
      </div>

      {/* Body */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton h-28 rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyKnowledge onAdd={() => setAddOpen(true)} onUpload={() => setUploadOpen(true)} />
      ) : (
        <div className="space-y-7">
          {Object.entries(grouped).map(([vertName, list]) => (
            <div key={vertName}>
              <div className="flex items-center gap-3 mb-3 pl-1">
                <span className="material-symbols-outlined text-on-surface-variant text-[18px]">
                  track_changes
                </span>
                <div className="font-headline font-bold text-base text-on-surface tracking-tight">
                  {vertName}
                </div>
                <div className="font-label text-[11px] text-on-surface-variant">
                  · {list.length} {list.length === 1 ? "entry" : "entries"}
                </div>
                <div className="flex-1 h-px bg-outline/10" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {list.map((e) => (
                  <KnowledgeCard key={e.id} entry={e} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {addOpen && (
        <AddInsightModal
          verticals={verticals}
          defaultVerticalId={activeVertical?.id}
          onClose={() => setAddOpen(false)}
          onSaved={() => {
            setAddOpen(false);
            fetchEntries();
          }}
        />
      )}

      {uploadOpen && (
        <UploadDocumentModal
          verticals={verticals}
          defaultVerticalId={activeVertical?.id}
          onClose={() => setUploadOpen(false)}
          onUploaded={() => {
            setUploadOpen(false);
            fetchEntries();
          }}
        />
      )}
    </AppShell>
  );
}

/* ────────────────────────── Tabs ────────────────────────── */

// Underline-style primary navigation tabs with live pointer-drag reorder.
// As you drag a tab, neighboring tabs slide live out of the way (200ms
// ease-out). No HTML5 drag ghost / "+" cursor — uses pointer events so
// the dragged tab visually follows the pointer with a soft lift/shadow.
// "All verticals" is pinned at the left and is not draggable.
function VerticalTabBar({ verticals, counts, activeSlug, onSelect, onReorder }) {
  // Drag state — null when not dragging
  const [drag, setDrag] = useState(null); // { slug, originIndex, hoverIndex, pointerDeltaX, draggedWidth }
  const tabRefs = useRef(new Map()); // slug -> HTMLElement
  const containerRef = useRef(null);

  const setTabRef = useCallback((slug, el) => {
    if (el) tabRefs.current.set(slug, el);
    else tabRefs.current.delete(slug);
  }, []);

  const startDrag = useCallback(
    (slug, e) => {
      const el = tabRefs.current.get(slug);
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const originIndex = verticals.findIndex((v) => v.slug === slug);
      if (originIndex < 0) return;

      // Capture the pointer so events keep flowing even outside the element
      try { el.setPointerCapture?.(e.pointerId); } catch {}

      setDrag({
        slug,
        originIndex,
        hoverIndex: originIndex,
        pointerStartX: e.clientX,
        pointerDeltaX: 0,
        draggedWidth: rect.width,
        // Snapshot tab rects so hover-index math doesn't shift mid-drag
        rects: verticals.map((v) => {
          const r = tabRefs.current.get(v.slug)?.getBoundingClientRect();
          return r ? { slug: v.slug, left: r.left, width: r.width } : null;
        }).filter(Boolean),
      });
    },
    [verticals],
  );

  const onPointerMove = useCallback(
    (e) => {
      setDrag((prev) => {
        if (!prev) return prev;
        const delta = e.clientX - prev.pointerStartX;
        // Pointer position in viewport
        const cursorX = e.clientX;
        // Determine hover index by which snapshotted slot's center the cursor is over
        let hoverIndex = prev.originIndex;
        for (let i = 0; i < prev.rects.length; i++) {
          const r = prev.rects[i];
          if (cursorX >= r.left && cursorX <= r.left + r.width) {
            hoverIndex = i;
            break;
          }
        }
        return { ...prev, pointerDeltaX: delta, hoverIndex };
      });
    },
    [],
  );

  const endDrag = useCallback(() => {
    setDrag((d) => {
      if (d && d.hoverIndex !== d.originIndex) {
        onReorder(d.slug, verticals[d.hoverIndex]?.slug);
      }
      return null;
    });
  }, [verticals, onReorder]);

  // Global pointer up — covers releases outside any tab
  useEffect(() => {
    if (!drag) return;
    const up = () => endDrag();
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [drag, endDrag]);

  // Compute the live transform for each tab during a drag.
  const transformFor = (slug, naturalIndex) => {
    if (!drag) return "";
    if (slug === drag.slug) {
      // Dragged tab follows the pointer + slight lift
      return `translateX(${drag.pointerDeltaX}px) scale(1.04)`;
    }
    // Other tabs slide to make room
    const { originIndex, hoverIndex, draggedWidth } = drag;
    const gap = 4; // matches gap-x-1
    const shift = draggedWidth + gap;
    if (originIndex < hoverIndex) {
      // Dragging right — tabs between (origin, hover] shift left
      if (naturalIndex > originIndex && naturalIndex <= hoverIndex) return `translateX(-${shift}px)`;
    } else if (originIndex > hoverIndex) {
      // Dragging left — tabs between [hover, origin) shift right
      if (naturalIndex < originIndex && naturalIndex >= hoverIndex) return `translateX(${shift}px)`;
    }
    return "";
  };

  return (
    <div className="mb-4 border-b border-outline/15">
      <div ref={containerRef} className="flex items-end flex-wrap gap-x-1 gap-y-1 select-none">
        <VerticalTab
          label="All verticals"
          count={counts.all}
          active={!activeSlug}
          onClick={() => onSelect(null)}
        />
        {verticals.map((v, i) => (
          <VerticalTab
            key={v.id}
            innerRef={(el) => setTabRef(v.slug, el)}
            label={v.display_name}
            count={counts[v.slug] ?? 0}
            active={activeSlug === v.slug}
            onClick={() => onSelect(v.slug)}
            isDragging={drag?.slug === v.slug}
            isDragActive={!!drag}
            transform={transformFor(v.slug, i)}
            onPointerDown={(e) => {
              if (e.button !== 0) return;
              startDrag(v.slug, e);
            }}
            onPointerMove={onPointerMove}
          />
        ))}
      </div>
    </div>
  );
}

function VerticalTab({
  label,
  count,
  active,
  onClick,
  innerRef,
  isDragging,
  isDragActive,
  transform,
  onPointerDown,
  onPointerMove,
}) {
  return (
    <button
      ref={innerRef}
      onClick={(e) => {
        // Suppress click if a drag just ended via this element
        if (isDragging) return;
        onClick?.(e);
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      className={[
        "group relative inline-flex items-center gap-2",
        "font-headline tracking-tight whitespace-nowrap",
        // Underline indicator
        "after:absolute after:left-3 after:right-3 after:-bottom-px after:h-[3px] after:rounded-t-full after:transition-all after:duration-200",
        active
          ? "px-4 py-3 text-[14.5px] text-on-surface font-extrabold after:bg-primary after:opacity-100"
          : "px-3 py-2.5 text-[12.5px] text-on-surface-variant font-semibold hover:text-on-surface after:bg-on-surface after:opacity-0 hover:after:opacity-20",
        isDragging ? "z-50 shadow-lg cursor-grabbing" : "cursor-grab",
        // Only animate position transitions for non-dragged tabs so the dragged
        // tab snaps to the pointer with zero lag.
        isDragging ? "" : "transition-transform duration-200 ease-out",
      ].filter(Boolean).join(" ")}
      style={{
        maxWidth: "240px",
        transform: transform || undefined,
        // The drag handle itself takes pointer-events; nothing else.
        touchAction: onPointerDown ? "none" : undefined,
      }}
    >
      <span className="truncate">{label}</span>
      <span
        className={[
          "shrink-0 tabular-nums font-label transition-all duration-200",
          active
            ? "text-[11px] px-1.5 py-0.5 rounded-full bg-on-surface text-background font-bold"
            : "text-[10.5px] text-on-surface-variant/70",
        ].join(" ")}
      >
        {count}
      </span>
    </button>
  );
}

/* ────────────────────────── Chips ────────────────────────── */

function Chip({ label, count, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-label text-[12px] font-semibold transition-colors ${
        active
          ? "bg-primary text-on-primary"
          : "bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
      }`}
    >
      {label}
      <span
        className={`tabular-nums text-[11px] font-bold ${
          active ? "text-on-primary/80" : "text-on-surface-variant/60"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

function SourceChip({ label, count, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md font-label text-[10.5px] font-bold transition-colors capitalize tracking-wider ${
        active
          ? "bg-on-surface text-background"
          : "bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-high"
      }`}
    >
      {label}
      {count > 0 && (
        <span className={active ? "text-background/70" : "text-on-surface-variant/60"}>
          {count}
        </span>
      )}
    </button>
  );
}

/* ────────────────────────── Knowledge card ────────────────────────── */

function KnowledgeCard({ entry }) {
  const type = TYPES.find((t) => t.id === entry.type) || TYPES[7];
  return (
    <div className={`p-4 rounded-2xl border ${TONE[type.tone]} transition-shadow hover:editorial-shadow`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5">
          <span
            className="material-symbols-outlined text-[16px]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            {type.icon}
          </span>
          <span className="font-label text-[10px] uppercase tracking-wider font-bold">
            {type.label}
          </span>
        </div>
        <WeightBar weight={entry.weight} />
      </div>
      <div className="font-label text-[13.5px] text-on-surface leading-relaxed">
        {entry.content}
      </div>
      {entry.evidence_quote && (
        <div className="mt-3 pt-3 border-t border-current/10 font-label text-[12px] italic text-on-surface-variant leading-relaxed">
          &ldquo;{entry.evidence_quote}&rdquo;
        </div>
      )}
      <div className="mt-3 flex items-center gap-2 font-label text-[10.5px] text-on-surface-variant/80">
        <span className="material-symbols-outlined text-[12px]">{sourceIcon(entry.source)}</span>
        <span className="capitalize font-medium">{entry.source || "agent"}</span>
        <span>·</span>
        <span>{timeAgo(entry.created_at)}</span>
      </div>
    </div>
  );
}

function WeightBar({ weight }) {
  const w = Math.max(0, Math.min(1, (weight ?? 1) / 2));
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-12 h-1 rounded-full bg-on-surface/10 overflow-hidden">
        <div
          className="h-full bg-current opacity-80"
          style={{ width: `${w * 100}%` }}
        />
      </div>
      <span className="font-label text-[10px] tabular-nums text-on-surface-variant/80">
        {(weight ?? 1).toFixed(1)}
      </span>
    </div>
  );
}

function sourceIcon(source) {
  if (source === "transcript") return "graphic_eq";
  if (source === "brain") return "psychology";
  if (source === "document") return "description";
  // 'manual' (operator-typed via Add Insight) — the only true manual path
  return "edit";
}

/* ────────────────────────── Empty + modal ────────────────────────── */

function EmptyKnowledge({ onAdd, onUpload }) {
  return (
    <div className="bg-surface-container-low rounded-2xl p-12 text-center editorial-shadow">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-surface-container-high mb-4">
        <span
          className="material-symbols-outlined text-on-surface-variant text-[32px]"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          psychology
        </span>
      </div>
      <div className="font-headline font-extrabold text-xl text-on-surface mb-2 tracking-tight">
        The brain is empty
      </div>
      <p className="font-label text-sm text-on-surface-variant mb-6 max-w-md mx-auto leading-relaxed">
        After your first calls and email outcomes, the agent will start writing insights
        in here automatically. You can also drop in a playbook PDF or add an insight
        manually to seed it.
      </p>
      <div className="flex items-center justify-center gap-2 flex-wrap">
        <button
          onClick={onUpload}
          className="px-4 py-2.5 rounded-2xl font-headline font-bold text-sm border border-outline/20 bg-surface-container-lowest text-on-surface hover:bg-surface-container-high transition-colors inline-flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-[18px]">upload_file</span>
          Upload a document
        </button>
        <button
          onClick={onAdd}
          className="metallic-silk gleam-hover text-on-primary px-5 py-2.5 rounded-2xl font-headline font-bold text-sm shadow-lg inline-flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-[20px]">add_circle</span>
          Add an insight
        </button>
      </div>
    </div>
  );
}

function AddInsightModal({ verticals, defaultVerticalId, onClose, onSaved }) {
  const [verticalId, setVerticalId] = useState(defaultVerticalId || verticals[0]?.id || "");
  const [type, setType] = useState("manual_insight");
  const [content, setContent] = useState("");
  const [weight, setWeight] = useState(1.0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const toast = useToast();

  const save = async () => {
    if (!supabase || !verticalId || !content.trim()) return;
    setSaving(true);
    setError(null);
    const { error: e } = await supabase.from("brain_entries").insert({
      vertical_id: verticalId,
      type,
      content: content.trim(),
      weight,
      source: "manual",
    });
    setSaving(false);
    if (e) {
      setError(e.message);
      toast.error("Couldn't save insight", { detail: e.message });
      return;
    }
    toast.success("Insight added to the brain", {
      detail: TYPES.find((t) => t.id === type)?.label,
    });
    onSaved();
  };

  return (
    <div
      className="fixed inset-0 bg-on-surface/40 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="glass-panel rounded-2xl max-w-lg w-full p-6 editorial-shadow-lg animate-scale-in"
      >
        <div className="mb-4">
          <div className="eyebrow text-on-surface-variant/70 mb-1">Manual</div>
          <h2 className="font-headline font-extrabold text-xl text-on-surface tracking-tight">
            Add a brain entry
          </h2>
          <p className="font-label text-xs text-on-surface-variant mt-1">
            Drop in something you've learned. Agent will use it on future calls + scripts.
          </p>
        </div>

        <Field label="Vertical">
          <select
            value={verticalId}
            onChange={(e) => setVerticalId(e.target.value)}
            className="w-full px-3 py-2 bg-surface-container-lowest border border-outline/15 rounded-xl text-sm font-label text-on-surface focus:outline-none focus:border-on-surface/40 transition-colors"
          >
            {verticals.map((v) => (
              <option key={v.id} value={v.id}>
                {v.display_name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Type">
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full px-3 py-2 bg-surface-container-lowest border border-outline/15 rounded-xl text-sm font-label text-on-surface focus:outline-none focus:border-on-surface/40 transition-colors"
          >
            {TYPES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Insight">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            placeholder="e.g. CFOs respond best to ROI-led openers, not 'quick chat' framing."
            className="w-full px-3 py-2 bg-surface-container-lowest border border-outline/15 rounded-xl text-sm font-label text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:border-on-surface/40 transition-colors leading-relaxed"
          />
        </Field>

        <Field label={`Confidence weight · ${weight.toFixed(1)}`}>
          <input
            type="range"
            min="0.5"
            max="2"
            step="0.1"
            value={weight}
            onChange={(e) => setWeight(parseFloat(e.target.value))}
            className="w-full accent-on-surface"
          />
        </Field>

        {error && (
          <div className="bg-error-container border border-error/30 text-on-error-container rounded-xl px-3 py-2 mb-3 text-sm font-label">
            ⚠ {error}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-outline/10">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-on-surface-variant hover:bg-surface-container-high font-label text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving || !content.trim()}
            className="metallic-silk gleam-hover text-on-primary px-5 py-2 rounded-xl font-headline font-bold text-sm shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {saving ? "Saving…" : "Save insight"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="mb-4">
      <label className="block eyebrow text-on-surface-variant mb-1.5">{label}</label>
      {children}
    </div>
  );
}

const timeAgo = sharedTimeAgo;
