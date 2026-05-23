"use client";
// ScriptCard — pre-call script surface on the /leads detail.
//
// Mid-call scannable design:
//   - Pre-call brief always visible at top
//   - Opener (single, auto-picked by trigger) always visible
//   - Angles, Objections, Ask, Voicemail, Avoid → accordion, click to open
//   - Color-coded sections so the eye finds them fast under stress
//   - No italics (sans-serif body)
//   - Tight line-height

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/app/lib/supabase";
import { hydrateStarterPlaybook } from "@/app/lib/starter-playbook";

const OPENER_LABELS = {
  cold_no_context:       "Cold opener",
  trigger_funding:       "Recent funding",
  trigger_hiring_spree:  "Hiring spree",
  trigger_competitor:    "Competitor news",
  referral:              "Referral",
};

const SECTION_COLOR = {
  angles:     { dot: "bg-tertiary",   headerBg: "bg-tertiary-container/40" },
  objections: { dot: "bg-amber-500",  headerBg: "bg-amber-50" },
  asks:       { dot: "bg-emerald-500", headerBg: "bg-emerald-50" },
  voicemail:  { dot: "bg-blue-500",   headerBg: "bg-blue-50" },
  avoid:      { dot: "bg-rose-500",   headerBg: "bg-rose-50" },
};

function pickOpenerVariant(playbook, lead) {
  const variants = playbook?.opener_variants || [];
  if (variants.length === 0) return null;
  const trigger = (lead?.trigger_event || "").toLowerCase();
  if (/series\s+[abc]|funding|raised/.test(trigger)) {
    return variants.find((v) => v.id === "trigger_funding") || variants[0];
  }
  if (/hiring|posted.*roles?|3\+ sdr|growing|expand/.test(trigger)) {
    return variants.find((v) => v.id === "trigger_hiring_spree") || variants[0];
  }
  if (/competitor|switched from|left|migrated/.test(trigger)) {
    return variants.find((v) => v.id === "trigger_competitor") || variants[0];
  }
  if (/referred|intro from/.test(trigger)) {
    return variants.find((v) => v.id === "referral") || variants[0];
  }
  return variants.find((v) => v.id === "cold_no_context") || variants[0];
}

function fillTemplate(text, lead) {
  if (!text) return text;
  return text
    .replace(/\{\{first\}\}/g, lead?.name?.split(" ")[0] || "there")
    .replace(/\{\{name\}\}/g, lead?.name || "there")
    .replace(/\{\{title\}\}/g, lead?.title || "")
    .replace(/\{\{company\}\}/g, lead?.company || "your company")
    .replace(/\{\{trigger_event\}\}/g, lead?.trigger_event || "the work you're doing")
    .replace(/\{\{pain_point\}\}/g, lead?.memory_summary?.split(".")[0] || "the pain we keep hearing")
    .replace(/\{\{ask\}\}/g, "a 15-min Zoom this week");
}

export default function ScriptCard({ lead, verticalId, vertical }) {
  // Parents that already have the vertical loaded (e.g. the leads page, which
  // pulls verticals via useVerticals) should pass it in — saves a round-trip
  // per lead-click. Falls back to fetching when only the id is provided.
  const [playbook, setPlaybook] = useState(() => vertical?.config?.playbook || null);
  const [verticalConfig, setVerticalConfig] = useState(() => vertical?.config || null);
  const [loading, setLoading] = useState(!vertical && !!verticalId);
  const [composing, setComposing] = useState(false);
  const [usingStarter, setUsingStarter] = useState(false);
  const [error, setError] = useState(null);
  const [openerOverride, setOpenerOverride] = useState(null);

  useEffect(() => {
    if (vertical) {
      setPlaybook(vertical.config?.playbook || null);
      setVerticalConfig(vertical.config || null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      if (!supabase || !verticalId) {
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from("verticals")
        .select("config")
        .eq("id", verticalId)
        .single();
      if (cancelled) return;
      setPlaybook(data?.config?.playbook || null);
      setVerticalConfig(data?.config || null);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [verticalId, vertical]);

  const useStarter = () => {
    setUsingStarter(true);
    setError(null);
    setPlaybook(hydrateStarterPlaybook(verticalConfig || {}));
  };

  const compose = async () => {
    if (!verticalId) return;
    setComposing(true);
    setError(null);
    try {
      const res = await fetch("/api/generate-playbook", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ vertical_id: verticalId }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Failed");
      setPlaybook(json.playbook);
    } catch (err) {
      setError(err.message);
    } finally {
      setComposing(false);
    }
  };

  const opener = useMemo(() => {
    if (!playbook) return null;
    if (openerOverride) {
      return playbook.opener_variants.find((v) => v.id === openerOverride) || null;
    }
    return pickOpenerVariant(playbook, lead);
  }, [playbook, lead, openerOverride]);

  const preCallBrief = useMemo(() => {
    if (!playbook?.pre_call_brief_template) return null;
    return fillTemplate(playbook.pre_call_brief_template, lead);
  }, [playbook, lead]);

  const primaryAsk = useMemo(() => {
    if (!playbook?.asks) return null;
    return playbook.asks.find((a) => a.primary) || playbook.asks[0];
  }, [playbook]);

  if (loading) return <div className="skeleton h-48 rounded-2xl" />;

  if (!playbook) {
    return (
      <div className="rounded-2xl border border-dashed border-outline/25 bg-surface-container-lowest/40 p-5 text-center">
        <div className="inline-flex w-12 h-12 rounded-2xl bg-surface-container items-center justify-center mb-3">
          <span className="material-symbols-outlined text-on-surface-variant">menu_book</span>
        </div>
        <div className="font-headline font-bold text-on-surface text-[14px]">
          First time calling? Start here.
        </div>
        <div className="font-label text-[12px] text-on-surface-variant mt-1 max-w-sm mx-auto leading-snug">
          Use the starter script to make your first calls right now. Once you've got a few outcomes
          logged, the brain will compose a playbook tuned to what's actually landing.
        </div>
        {error && (
          <div className="font-label text-[11.5px] text-on-error-container bg-error-container/40 border border-error/20 rounded-lg px-3 py-2 mt-3 inline-block">
            {error}
          </div>
        )}
        <div className="mt-3 inline-flex items-center gap-2 flex-wrap justify-center">
          <button
            onClick={useStarter}
            className="metallic-silk gleam-hover text-on-primary px-4 py-2 rounded-xl font-headline font-bold text-[12.5px] shadow inline-flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[16px]">play_arrow</span>
            Use starter script
          </button>
          <button
            onClick={compose}
            disabled={composing}
            className="px-4 py-2 rounded-xl font-label text-[12.5px] font-semibold border border-outline/25 text-on-surface hover:bg-surface-container-high transition-colors inline-flex items-center gap-2 disabled:opacity-50"
            title="Compose a playbook from your call history. Best after you've made some calls."
          >
            {composing ? (
              <>
                <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                Composing…
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
                Compose from brain
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-outline/15 bg-surface-container-lowest overflow-hidden">
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-outline/10 bg-surface-container-low/50 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="eyebrow text-on-surface-variant/70 flex items-center gap-1.5">
            Script
            {(usingStarter || playbook.is_starter) && (
              <span className="font-label text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-800 font-bold">
                Starter
              </span>
            )}
          </div>
          <div className="font-headline font-extrabold text-on-surface text-[13.5px] tracking-tight">
            {usingStarter || playbook.is_starter
              ? "Starter playbook · upgrade after some calls"
              : `Playbook · ${playbook.based_on_brain_entries} entries`}
          </div>
        </div>
        <button
          onClick={compose}
          disabled={composing}
          title={
            usingStarter || playbook.is_starter
              ? "Replace starter with a brain-composed playbook"
              : "Regenerate from brain"
          }
          className="text-on-surface-variant hover:text-on-surface w-8 h-8 rounded-full hover:bg-surface-container-high inline-flex items-center justify-center transition-colors disabled:opacity-40"
        >
          <span className={`material-symbols-outlined text-[18px] ${composing ? "animate-spin" : ""}`}>
            {composing ? "progress_activity" : usingStarter || playbook.is_starter ? "auto_awesome" : "refresh"}
          </span>
        </button>
      </div>

      {/* Always-visible section: brief + opener */}
      <div className="px-3 pt-3 space-y-2">
        {preCallBrief && (
          <div className="rounded-lg border-l-4 border-l-indigo-400 border-y border-r border-outline/10 bg-indigo-50/30 px-3.5 py-2.5">
            <div className="font-headline text-[10.5px] uppercase tracking-wider font-extrabold text-indigo-900 mb-1">
              Pre-call brief
            </div>
            <div className="font-label text-[13px] text-on-surface leading-snug">{preCallBrief}</div>
          </div>
        )}

        {opener && (
          <div className="rounded-lg border-l-4 border-l-indigo-400 border-y border-r border-outline/10 bg-surface-container-low px-3.5 py-2.5">
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="font-headline text-[10.5px] uppercase tracking-wider font-extrabold text-indigo-900">
                Opener · {OPENER_LABELS[opener.id] || opener.id}
              </div>
              <select
                value={openerOverride ?? opener.id}
                onChange={(e) => setOpenerOverride(e.target.value)}
                className="font-label text-[10.5px] bg-transparent text-on-surface-variant hover:text-on-surface border-0 focus:outline-none cursor-pointer"
              >
                {playbook.opener_variants.map((v) => (
                  <option key={v.id} value={v.id}>
                    {OPENER_LABELS[v.id] || v.id}
                  </option>
                ))}
              </select>
            </div>
            <div className="font-label text-[13.5px] text-on-surface leading-snug">
              {fillTemplate(opener.text, lead)}
            </div>
          </div>
        )}

        {primaryAsk && (
          <div className="rounded-lg border-l-4 border-l-emerald-400 border-y border-r border-outline/10 bg-emerald-50/40 px-3.5 py-2 flex items-center gap-2">
            <span
              className="material-symbols-outlined text-[18px] text-emerald-600"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              flag
            </span>
            <div className="flex-1 min-w-0">
              <div className="font-headline text-[10.5px] uppercase tracking-wider font-extrabold text-emerald-800">
                The ask
              </div>
              <div className="font-label text-[13.5px] font-bold text-on-surface">{primaryAsk.text}</div>
            </div>
          </div>
        )}
      </div>

      {/* Accordion sections */}
      <div className="p-3 space-y-2">
        {playbook.angles?.length > 0 && (
          <ScriptAccordion tone="angles" title="Angles" count={playbook.angles.length}>
            <ul className="space-y-1">
              {playbook.angles.map((a) => (
                <li
                  key={a.id}
                  className="flex items-start gap-2 rounded-lg border-l-4 border-l-tertiary border-y border-r border-outline/10 bg-surface-container-lowest px-3 py-1.5"
                >
                  <span
                    className="material-symbols-outlined text-[14px] text-tertiary mt-0.5 shrink-0"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    bolt
                  </span>
                  <span className="font-label text-[13px] text-on-surface leading-snug">{fillTemplate(a.text, lead)}</span>
                </li>
              ))}
            </ul>
          </ScriptAccordion>
        )}

        {playbook.objections?.length > 0 && (
          <ScriptAccordion tone="objections" title="Objection cheat-sheet" count={playbook.objections.length}>
            <div className="space-y-1.5">
              {playbook.objections.map((o) => (
                <div
                  key={o.id}
                  className="rounded-lg border-l-4 border-l-amber-400 border-y border-r border-outline/10 bg-surface-container-lowest px-3.5 py-2"
                >
                  <div className="font-headline text-[11px] uppercase tracking-wider font-extrabold text-amber-900 mb-0.5">
                    "{o.trigger}"
                  </div>
                  <div className="font-label text-[12.5px] text-on-surface leading-snug">→ {fillTemplate(o.rebuttal, lead)}</div>
                </div>
              ))}
            </div>
          </ScriptAccordion>
        )}

        {playbook.voicemail_script && (
          <ScriptAccordion tone="voicemail" title="Voicemail" subtitle="≤15s">
            <div className="rounded-lg border-l-4 border-l-blue-400 border-y border-r border-outline/10 bg-surface-container-lowest px-3.5 py-2 font-label text-[13px] text-on-surface leading-snug">
              {fillTemplate(playbook.voicemail_script, lead)}
            </div>
          </ScriptAccordion>
        )}

        {playbook.avoid?.length > 0 && (
          <ScriptAccordion tone="avoid" title="Avoid" count={playbook.avoid.length}>
            <ul className="space-y-1">
              {playbook.avoid.slice(0, 4).map((a, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 rounded-lg border-l-4 border-l-rose-400 border-y border-r border-outline/10 bg-surface-container-lowest px-3 py-1.5 font-label text-[12px] text-on-surface leading-snug"
                >
                  <span className="material-symbols-outlined text-[13px] text-rose-500 mt-0.5 shrink-0">block</span>
                  {a}
                </li>
              ))}
            </ul>
          </ScriptAccordion>
        )}
      </div>
    </div>
  );
}

function ScriptAccordion({ tone, title, subtitle, count, children }) {
  const [open, setOpen] = useState(false);
  const c = SECTION_COLOR[tone] || SECTION_COLOR.angles;
  return (
    <div className="rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center justify-between gap-3 px-3 py-2 ${c.headerBg} hover:brightness-105 transition-all`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className={`h-2 w-2 rounded-full shrink-0 ${c.dot}`} />
          <span className="font-headline font-extrabold text-[12.5px] text-on-surface tracking-tight">{title}</span>
          {count != null && (
            <span className="font-label text-[10px] tabular-nums text-on-surface-variant/80 bg-surface-container-lowest/70 px-1.5 py-0.5 rounded">
              {count}
            </span>
          )}
          {subtitle && (
            <span className="font-label text-[10px] text-on-surface-variant/70">· {subtitle}</span>
          )}
        </div>
        <span className={`material-symbols-outlined text-[16px] text-on-surface-variant transition-transform ${open ? "rotate-180" : ""}`}>
          expand_more
        </span>
      </button>
      {open && <div className="px-2 pt-2 pb-2 animate-fade-in">{children}</div>}
    </div>
  );
}
