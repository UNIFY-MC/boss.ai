"use client";
// VerticalPlaybookCard — full read view of a vertical's playbook on /verticals/[slug].
//
// Designed to be scanned MID-CALL. Each section is a collapsible accordion
// with color coding (opener=indigo, angles=tertiary, objections=amber,
// asks=tertiary, voicemail=blue, avoid=rose). Default-open: opener +
// angles. Default-closed: objections, asks, voicemail, avoid — operator
// hits them when they need them.
//
// No italics. Compact line-height. Section headers are sticky-feeling.

import { useState } from "react";

const OPENER_LABELS = {
  cold_no_context:       "Cold opener",
  trigger_funding:       "Recent funding",
  trigger_hiring_spree:  "Hiring spree",
  trigger_competitor:    "Competitor news",
  referral:              "Referral",
};

// On the vertical-level view there's no specific lead. Render template
// placeholders as readable, obviously-placeholder English instead of the
// {{first}}/{{company}} template syntax leaking through.
const PLACEHOLDER_LABELS = {
  first:         "[first name]",
  name:          "[name]",
  title:         "[title]",
  company:       "[their company]",
  trigger_event: "[recent trigger]",
  pain_point:    "[pain point]",
  ask:           "[the ask]",
};

function humanizePlaceholders(text) {
  if (!text) return text;
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => PLACEHOLDER_LABELS[key] || `[${key}]`);
}

const SECTION_COLOR = {
  opener:     { dot: "bg-indigo-500",     headerBg: "bg-indigo-50",     borderL: "border-l-indigo-400" },
  angles:     { dot: "bg-tertiary",       headerBg: "bg-tertiary-container/40", borderL: "border-l-tertiary" },
  objections: { dot: "bg-amber-500",      headerBg: "bg-amber-50",      borderL: "border-l-amber-400" },
  asks:       { dot: "bg-emerald-500",    headerBg: "bg-emerald-50",    borderL: "border-l-emerald-400" },
  voicemail:  { dot: "bg-blue-500",       headerBg: "bg-blue-50",       borderL: "border-l-blue-400" },
  avoid:      { dot: "bg-rose-500",       headerBg: "bg-rose-50",       borderL: "border-l-rose-400" },
};

// Every section's identifier — used both for default-open seeding and the
// "Show all / Close all" toggle.
const SECTION_KEYS = ["opener", "angles", "objections", "asks", "voicemail", "avoid"];
const DEFAULT_OPEN = new Set(["opener", "angles"]);

export default function VerticalPlaybookCard({ vertical, onUpdated }) {
  const [composing, setComposing] = useState(false);
  const [error, setError] = useState(null);
  const playbook = vertical?.config?.playbook;
  // Controlled accordion state — keyed by section id.
  const [openSections, setOpenSections] = useState(DEFAULT_OPEN);
  const allOpen = SECTION_KEYS.every((k) => openSections.has(k));
  const toggleSection = (key) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };
  const showAll = () => setOpenSections(new Set(SECTION_KEYS));
  const closeAll = () => setOpenSections(new Set());

  const regenerate = async () => {
    setComposing(true);
    setError(null);
    try {
      const res = await fetch("/api/generate-playbook", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ vertical_id: vertical.id }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Failed");
      onUpdated?.({
        ...vertical,
        config: { ...(vertical.config || {}), playbook: json.playbook },
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setComposing(false);
    }
  };

  const generatedAgo = playbook?.generated_at ? relativeTime(playbook.generated_at) : null;

  return (
    <div className="rounded-2xl bg-surface-container-low editorial-shadow overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-outline/10 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="material-symbols-outlined text-on-surface-variant text-[20px]">menu_book</span>
          <div>
            <div className="font-headline font-extrabold text-on-surface tracking-tight">Playbook</div>
            {playbook && (
              <div className="font-label text-[11.5px] text-on-surface-variant mt-0.5">
                Composed {generatedAgo} · {playbook.based_on_brain_entries} brain entries
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {playbook && (
            <button
              onClick={allOpen ? closeAll : showAll}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-headline text-[12px] font-bold text-on-surface-variant hover:text-on-surface bg-surface-container-lowest border border-outline/15 hover:bg-surface-container hover:border-outline/30 hover:-translate-y-px transition-all"
              title={allOpen ? "Collapse every section" : "Expand every section"}
            >
              <span className="material-symbols-outlined text-[14px]">
                {allOpen ? "unfold_less" : "unfold_more"}
              </span>
              {allOpen ? "Close all" : "Show all"}
            </button>
          )}
          <button
            onClick={regenerate}
            disabled={composing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-headline text-[12px] font-bold text-on-surface bg-surface-container-lowest border border-outline/15 hover:bg-surface-container hover:border-outline/30 hover:-translate-y-px transition-all disabled:opacity-50"
          >
            <span className={`material-symbols-outlined text-[14px] ${composing ? "animate-spin" : ""}`}>
              {composing ? "progress_activity" : (playbook ? "refresh" : "auto_awesome")}
            </span>
            {composing ? "Composing…" : (playbook ? "Regenerate" : "Compose playbook")}
          </button>
        </div>
      </div>

      {error && (
        <div className="mx-5 mt-3 px-3 py-2 rounded-lg bg-error-container/40 border border-error/20 font-label text-[12px] text-on-error-container">
          {error}
        </div>
      )}

      {!playbook ? (
        <div className="p-8 text-center">
          <div className="font-label text-sm text-on-surface-variant max-w-md mx-auto">
            No playbook yet. Hit "Compose playbook" to synthesize a runnable
            cold-call script from the brain.
          </div>
        </div>
      ) : (
        <div className="p-3 space-y-2">
          <Accordion
            sectionKey="opener"
            open={openSections.has("opener")}
            onToggle={toggleSection}
            tone="opener"
            title="Opener variants"
            count={playbook.opener_variants?.length}
          >
            <div className="space-y-2">
              {playbook.opener_variants.map((v) => (
                <div
                  key={v.id}
                  className="rounded-lg border-l-4 border-l-indigo-400 border-y border-r border-outline/10 bg-surface-container-lowest px-3.5 py-2.5"
                >
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <div className="font-headline text-[12px] font-extrabold text-indigo-900 uppercase tracking-wider">
                      {OPENER_LABELS[v.id] || v.id}
                    </div>
                    {v.trigger_hint && (
                      <div className="font-label text-[10.5px] text-on-surface-variant/70 truncate">
                        when: {v.trigger_hint}
                      </div>
                    )}
                  </div>
                  <div className="font-label text-[13.5px] text-on-surface leading-snug">
                    {humanizePlaceholders(v.text)}
                  </div>
                </div>
              ))}
            </div>
          </Accordion>

          <Accordion
            sectionKey="angles"
            open={openSections.has("angles")}
            onToggle={toggleSection}
            tone="angles"
            title="Angles"
            count={playbook.angles?.length}
          >
            <ul className="space-y-1.5">
              {playbook.angles.map((a) => (
                <li
                  key={a.id}
                  className="flex items-start gap-2 rounded-lg border-l-4 border-l-tertiary border-y border-r border-outline/10 bg-surface-container-lowest px-3 py-2"
                >
                  <span
                    className="material-symbols-outlined text-[16px] text-tertiary mt-0.5 shrink-0"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    bolt
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-label text-[13.5px] text-on-surface leading-snug">{a.text}</div>
                  </div>
                  <div className="font-label text-[10.5px] tabular-nums text-on-surface-variant/70 shrink-0 self-center">
                    w {a.weight?.toFixed(1) ?? "1.0"}
                  </div>
                </li>
              ))}
            </ul>
          </Accordion>

          <Accordion
            sectionKey="objections"
            open={openSections.has("objections")}
            onToggle={toggleSection}
            tone="objections"
            title="Objection cheat-sheet"
            count={playbook.objections?.length}
          >
            <div className="space-y-1.5">
              {playbook.objections.map((o) => (
                <div
                  key={o.id}
                  className="rounded-lg border-l-4 border-l-amber-400 border-y border-r border-outline/10 bg-surface-container-lowest px-3.5 py-2.5"
                >
                  <div className="font-headline text-[11.5px] uppercase tracking-wider font-extrabold text-amber-900 mb-1">
                    "{o.trigger}"
                  </div>
                  <div className="font-label text-[13px] text-on-surface leading-snug">
                    → {o.rebuttal}
                  </div>
                </div>
              ))}
            </div>
          </Accordion>

          <Accordion
            sectionKey="asks"
            open={openSections.has("asks")}
            onToggle={toggleSection}
            tone="asks"
            title="Asks"
            count={playbook.asks?.length}
          >
            <ul className="space-y-1">
              {playbook.asks.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center gap-2 rounded-lg border-l-4 border-l-emerald-400 border-y border-r border-outline/10 bg-surface-container-lowest px-3.5 py-2"
                >
                  <span
                    className={`material-symbols-outlined text-[16px] ${a.primary ? "text-emerald-600" : "text-on-surface-variant/60"}`}
                    style={{ fontVariationSettings: a.primary ? "'FILL' 1" : "'FILL' 0" }}
                  >
                    {a.primary ? "flag" : "outlined_flag"}
                  </span>
                  <span className={`font-label text-[13.5px] text-on-surface ${a.primary ? "font-bold" : ""}`}>
                    {a.text}
                  </span>
                  {a.primary && (
                    <span className="font-label text-[10px] uppercase tracking-wider text-emerald-700 font-bold">
                      primary
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </Accordion>

          {playbook.voicemail_script && (
            <Accordion
              sectionKey="voicemail"
              open={openSections.has("voicemail")}
              onToggle={toggleSection}
              tone="voicemail"
              title="Voicemail"
              subtitle="≤15 seconds"
            >
              <div className="rounded-lg border-l-4 border-l-blue-400 border-y border-r border-outline/10 bg-surface-container-lowest px-3.5 py-2.5 font-label text-[13.5px] text-on-surface leading-snug">
                {humanizePlaceholders(playbook.voicemail_script)}
              </div>
            </Accordion>
          )}

          {playbook.avoid?.length > 0 && (
            <Accordion
              sectionKey="avoid"
              open={openSections.has("avoid")}
              onToggle={toggleSection}
              tone="avoid"
              title="Avoid"
              count={playbook.avoid.length}
            >
              <ul className="space-y-1">
                {playbook.avoid.map((a, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 rounded-lg border-l-4 border-l-rose-400 border-y border-r border-outline/10 bg-surface-container-lowest px-3 py-2 font-label text-[12.5px] text-on-surface leading-snug"
                  >
                    <span className="material-symbols-outlined text-[14px] text-rose-500 mt-0.5 shrink-0">block</span>
                    {a}
                  </li>
                ))}
              </ul>
            </Accordion>
          )}
        </div>
      )}
    </div>
  );
}

function Accordion({ sectionKey, open, onToggle, tone, title, subtitle, count, children }) {
  const c = SECTION_COLOR[tone] || SECTION_COLOR.angles;
  return (
    <div className="rounded-xl overflow-hidden">
      <button
        onClick={() => onToggle?.(sectionKey)}
        className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 ${c.headerBg} hover:brightness-105 transition-all`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${c.dot}`} />
          <span className="font-headline font-extrabold text-[13.5px] text-on-surface tracking-tight">
            {title}
          </span>
          {count != null && (
            <span className="font-label text-[10.5px] tabular-nums text-on-surface-variant/80 bg-surface-container-lowest/70 px-1.5 py-0.5 rounded">
              {count}
            </span>
          )}
          {subtitle && (
            <span className="font-label text-[10.5px] text-on-surface-variant/70 truncate">
              · {subtitle}
            </span>
          )}
        </div>
        <span className={`material-symbols-outlined text-[18px] text-on-surface-variant transition-transform ${open ? "rotate-180" : ""}`}>
          expand_more
        </span>
      </button>
      {open && <div className="px-2 pt-2 pb-2 animate-fade-in">{children}</div>}
    </div>
  );
}

function relativeTime(ts) {
  const sec = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (sec < 60) return "just now";
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}
