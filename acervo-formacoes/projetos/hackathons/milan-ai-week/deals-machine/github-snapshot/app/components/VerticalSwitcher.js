"use client";
// Vertical switcher dropdown — pick the active vertical or open
// the wizard to build a new one. Persists pick in localStorage.

import { useEffect, useRef, useState } from "react";
import VerticalBuilderWizard from "./VerticalBuilderWizard";

const STORAGE_KEY = "deals-machine.active_vertical_id";
// Set by CallButton when a call is placed. Takes priority over the
// "remembered active vertical" if it's fresh (< 5 min), so when the
// operator switches to /intelligence right after a call, the panel
// already shows that vertical's events.
const LAST_CALL_VERTICAL_LS = "deals-machine.last_call_vertical";
const LAST_CALL_FRESHNESS_MS = 5 * 60 * 1000;

export default function VerticalSwitcher({ onChange, initialSlug }) {
  const [verticals, setVerticals] = useState([]);
  const [active, setActive] = useState(null);
  const [open, setOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const wrapRef = useRef(null);

  const refresh = async () => {
    try {
      const res = await fetch("/api/verticals");
      const data = await res.json();
      const list = data.verticals ?? [];
      setVerticals(list);

      // Priority order for which vertical we land on:
      //   1. Explicit URL ?vertical=slug (operator's hard intent)
      //   2. Vertical of the most recent call, if fresh (<5 min) —
      //      Kyle's case: dial a lead, switch to /intelligence, the
      //      streaming panel should already be on that lead's vertical
      //   3. The saved "active vertical" from a prior session
      //   4. First vertical in the list
      let lastCallId = null;
      if (typeof window !== "undefined") {
        try {
          const raw = localStorage.getItem(LAST_CALL_VERTICAL_LS);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed?.ts && Date.now() - parsed.ts < LAST_CALL_FRESHNESS_MS) {
              lastCallId = parsed.vertical_id;
            }
          }
        } catch (_) {}
      }
      const saved =
        typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
      const match =
        (initialSlug && list.find((v) => v.slug === initialSlug)) ||
        (lastCallId && list.find((v) => v.id === lastCallId)) ||
        list.find((v) => v.id === saved) ||
        list[0];
      if (match) {
        setActive(match);
        if (typeof window !== "undefined")
          localStorage.setItem(STORAGE_KEY, match.id);
        onChange?.(match);
      }
    } catch (err) {
      console.error("[VerticalSwitcher] load failed:", err);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [open]);

  const pick = (v) => {
    setActive(v);
    setOpen(false);
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, v.id);
    onChange?.(v);
  };

  const onWizardSaved = async (saved) => {
    setWizardOpen(false);
    await refresh();
    if (saved?.id) {
      const fresh = await (await fetch("/api/verticals")).json();
      const match = (fresh.verticals ?? []).find((v) => v.id === saved.id);
      if (match) pick(match);
    }
  };

  return (
    <div ref={wrapRef} className="relative inline-block w-full min-w-[260px]">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2.5 px-3.5 py-3 bg-surface-container-lowest border border-outline/15 rounded-xl hover:bg-surface-container-high hover:border-outline/30 transition-colors focus:outline-none focus:border-on-surface/40"
      >
        <span className="w-2 h-2 rounded-full bg-tertiary shrink-0" />
        <span className="flex-1 text-left min-w-0">
          <div className="font-headline font-bold text-sm text-on-surface truncate tracking-tight">
            {active?.display_name ?? "Pick a vertical"}
          </div>
        </span>
        <span
          className={`material-symbols-outlined text-on-surface-variant text-[18px] transition-transform ${open ? "rotate-180" : ""}`}
        >
          expand_more
        </span>
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-surface-container-low rounded-2xl editorial-shadow-lg border border-outline/10 z-30 p-1.5 max-h-80 overflow-y-auto animate-scale-in">
          {verticals.length === 0 ? (
            <div className="px-3 py-4 text-center font-label text-sm text-on-surface-variant">
              No verticals yet.
            </div>
          ) : (
            verticals.map((v) => {
              const isActive = v.id === active?.id;
              return (
                <button
                  key={v.id}
                  onClick={() => pick(v)}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl transition-colors text-left ${
                    isActive
                      ? "bg-surface-container-high"
                      : "hover:bg-surface-container/50"
                  }`}
                >
                  <div className="min-w-0">
                    <div
                      className={`font-headline text-[14px] text-on-surface truncate tracking-tight ${isActive ? "font-extrabold" : "font-semibold"}`}
                    >
                      {v.display_name}
                    </div>
                    {v.short_summary && (
                      <div className="font-label text-[11.5px] text-on-surface-variant truncate mt-0.5">
                        {v.short_summary}
                      </div>
                    )}
                  </div>
                  {isActive && (
                    <span
                      className="material-symbols-outlined text-[18px] text-tertiary shrink-0"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      check_circle
                    </span>
                  )}
                </button>
              );
            })
          )}

          {verticals.length > 0 && <div className="divider-soft mx-2 my-1" />}

          <button
            onClick={() => {
              setOpen(false);
              setWizardOpen(true);
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-primary/5 transition-colors text-left group"
          >
            <div className="shrink-0 w-7 h-7 rounded-lg metallic-silk flex items-center justify-center">
              <span className="material-symbols-outlined text-on-primary text-[16px]">
                add
              </span>
            </div>
            <div className="min-w-0">
              <div className="font-headline font-bold text-[13.5px] text-on-surface tracking-tight">
                Build a new vertical
              </div>
              <div className="font-label text-[11px] text-on-surface-variant mt-0.5">
                Let the agent draft it
              </div>
            </div>
          </button>
        </div>
      )}

      {wizardOpen && (
        <VerticalBuilderWizard
          onClose={() => setWizardOpen(false)}
          onSaved={onWizardSaved}
        />
      )}
    </div>
  );
}
