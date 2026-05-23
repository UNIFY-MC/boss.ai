"use client";
// VerticalFilterDropdown — checkbox-list dropdown for multi-selecting which
// verticals to include in a view. Used on /pipeline and /leads.
//
// Semantics: selectedIds is always an explicit Set.
//   - Full set = "All · N"
//   - Empty set = "None" (filters everything out)
//   - Subset = "Aviation Vertical" (1) or "2 of 5" (many)
// Initialization happens in the parent (set with every vertical ID on first load).

import { useEffect, useMemo, useRef, useState } from "react";

export default function VerticalFilterDropdown({
  verticals,
  selectedIds,
  onToggle,
  onClear,
  onSelectAll,
  label = "Filter by vertical",
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const sortedVerticals = useMemo(
    () => [...verticals].sort((a, b) => a.display_name.localeCompare(b.display_name)),
    [verticals],
  );

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onEsc = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  const setSize = selectedIds?.size ?? 0;
  const total = verticals.length;
  const allSelected = setSize === total && total > 0;
  const noneSelected = setSize === 0;
  const summary = allSelected
    ? `All · ${total}`
    : noneSelected
      ? `None`
      : setSize === 1
        ? sortedVerticals.find((v) => selectedIds.has(v.id))?.display_name ?? "1 selected"
        : `${setSize} of ${total}`;

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl font-headline text-[13px] font-semibold border border-outline/20 bg-surface-container-lowest text-on-surface hover:bg-surface-container hover:border-outline/30 transition-all"
      >
        <span className="material-symbols-outlined text-[16px] text-on-surface-variant">filter_list</span>
        <span>{label}</span>
        <span className="font-label text-[11.5px] tabular-nums text-on-surface-variant/80 max-w-[180px] truncate">
          {summary}
        </span>
        <span className={`material-symbols-outlined text-[18px] text-on-surface-variant transition-transform ${open ? "rotate-180" : ""}`}>
          expand_more
        </span>
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 z-30 min-w-[300px] rounded-2xl bg-surface-container-low border border-outline/15 editorial-shadow-lg overflow-hidden animate-scale-in">
          <div className="px-3 py-2 border-b border-outline/10 flex items-center justify-between gap-2">
            <span className="eyebrow text-on-surface-variant/70">Verticals</span>
            <div className="flex items-center gap-1">
              <button
                onClick={onSelectAll}
                disabled={allSelected}
                className="font-label text-[11px] font-bold px-2 py-1 rounded-md text-on-surface-variant hover:text-on-surface hover:bg-surface-container disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                All
              </button>
              <span className="text-on-surface-variant/30 text-[11px]">·</span>
              <button
                onClick={onClear}
                disabled={noneSelected}
                className="font-label text-[11px] font-bold px-2 py-1 rounded-md text-on-surface-variant hover:text-on-surface hover:bg-surface-container disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
          <ul className="py-1.5 max-h-72 overflow-y-auto">
            {sortedVerticals.map((v) => {
              const checked = selectedIds.has(v.id);
              return (
                <li key={v.id}>
                  <button
                    onClick={() => onToggle(v.id)}
                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-surface-container transition-colors text-left"
                  >
                    <Checkbox checked={checked} />
                    <span className="flex-1 min-w-0 font-label text-[13.5px] text-on-surface truncate">
                      {v.display_name}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

function Checkbox({ checked }) {
  return (
    <span
      className={[
        "shrink-0 w-[18px] h-[18px] rounded-md border flex items-center justify-center transition-all",
        checked
          ? "bg-on-surface border-on-surface"
          : "bg-surface-container-lowest border-outline/40",
      ].join(" ")}
    >
      <svg
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`w-[11px] h-[11px] transition-opacity ${checked ? "opacity-100" : "opacity-0"}`}
        aria-hidden="true"
      >
        <path
          d="M3 8.5 L6.5 12 L13 4.5"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-background"
        />
      </svg>
    </span>
  );
}
