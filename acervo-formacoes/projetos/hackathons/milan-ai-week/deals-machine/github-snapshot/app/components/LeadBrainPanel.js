"use client";
// LeadBrainPanel — the richer "what the brain knows about this lead"
// surface that replaces the single-line memory_summary on the lead
// detail. Shows the summary as the headline, then all brain entries
// linked to this lead (grouped by type), then the last few activity
// log events for context.
//
// Queries brain_entries and activity_log directly via the anon client.
// Both tables have allow_all RLS policies.

import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabase";
import { timeAgo } from "@/app/lib/format";
import EmptyState from "./EmptyState";

const TYPE_META = {
  angle_landed:        { label: "Angles that landed",       icon: "trending_up",     tone: "emerald" },
  angle_failed:        { label: "Angles that flopped",      icon: "trending_down",   tone: "rose" },
  objection_recurring: { label: "Recurring objections",     icon: "error",           tone: "amber" },
  commitment_made:     { label: "Commitments",              icon: "handshake",       tone: "indigo" },
  deal_killer:         { label: "Deal killers",             icon: "block",           tone: "rose" },
  profile_chase:       { label: "Why this profile works",   icon: "person_search",   tone: "emerald" },
  profile_avoid:       { label: "Why this profile struggles", icon: "person_off",    tone: "rose" },
};

const TONE_CLASSES = {
  emerald: "bg-tertiary-container text-on-tertiary-container border-tertiary/30",
  rose:    "bg-error-container/60 text-on-error-container border-error/30",
  amber:   "bg-amber-500/15 text-amber-800 border-amber-500/30",
  indigo:  "bg-indigo-500/12 text-indigo-700 border-indigo-500/25",
  slate:   "bg-surface-container-high text-on-surface-variant border-outline/15",
};

export default function LeadBrainPanel({ lead }) {
  const [entries, setEntries] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!lead?.id || !supabase) {
      setEntries([]);
      setActivity([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      const [entriesRes, activityRes] = await Promise.all([
        supabase
          .from("brain_entries")
          .select("id, type, content, weight, source, evidence_quote, created_at")
          .eq("lead_id", lead.id)
          .order("weight", { ascending: false })
          .limit(20),
        supabase
          .from("activity_log")
          .select("id, type, message, created_at")
          .eq("lead_id", lead.id)
          .order("created_at", { ascending: false })
          .limit(6),
      ]);
      if (cancelled) return;
      setEntries(entriesRes.data ?? []);
      setActivity(activityRes.data ?? []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [lead?.id]);

  const hasSummary = !!lead?.memory_summary;
  const hasEntries = entries.length > 0;
  const hasActivity = activity.length > 0;

  if (!hasSummary && !hasEntries && !hasActivity && !loading) {
    return null;
  }

  // Group entries by type so the panel reads as a real dossier.
  const groups = entries.reduce((acc, e) => {
    if (!acc[e.type]) acc[e.type] = [];
    acc[e.type].push(e);
    return acc;
  }, {});

  const orderedTypes = Object.keys(TYPE_META).filter((t) => groups[t]);

  return (
    <div className="mt-5 rounded-2xl border border-outline/10 bg-surface-container-lowest overflow-hidden">
      <div className="px-5 py-4 border-b border-outline/10 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-tertiary-container flex items-center justify-center shrink-0">
          <span
            className="material-symbols-outlined text-on-tertiary-container text-[18px]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            psychology
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="eyebrow text-on-surface-variant">What the brain knows about this lead</div>
          <div className="font-label text-[12px] text-on-surface-variant/80 mt-0.5">
            {loading
              ? "Loading dossier…"
              : `${entries.length} learned insight${entries.length === 1 ? "" : "s"}${activity.length ? ` · ${activity.length} recent event${activity.length === 1 ? "" : "s"}` : ""}`}
          </div>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {hasSummary && (
          <div>
            <div className="eyebrow text-on-surface-variant mb-1.5">Summary</div>
            <div className="font-label text-[14px] text-on-surface leading-relaxed">
              {lead.memory_summary}
            </div>
          </div>
        )}

        {hasEntries && (
          <div>
            <div className="eyebrow text-on-surface-variant mb-2">From prior calls + sources</div>
            <div className="space-y-3">
              {orderedTypes.map((type) => {
                const meta = TYPE_META[type];
                const items = groups[type];
                const cls = TONE_CLASSES[meta.tone] ?? TONE_CLASSES.slate;
                return (
                  <div key={type} className="rounded-xl border border-outline/10 overflow-hidden bg-surface-container-low">
                    <div className={`px-4 py-2 flex items-center gap-2 border-b ${cls}`}>
                      <span
                        className="material-symbols-outlined text-[16px]"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        {meta.icon}
                      </span>
                      <div className="eyebrow uppercase tracking-wider font-bold">
                        {meta.label}
                      </div>
                      <span className="ml-auto font-label text-[11px] opacity-70">
                        {items.length}
                      </span>
                    </div>
                    <div className="divide-y divide-outline/8">
                      {items.map((e) => (
                        <div key={e.id} className="px-4 py-3">
                          <div className="font-label text-[13.5px] text-on-surface leading-snug">
                            {e.content}
                          </div>
                          {e.evidence_quote && (
                            <div className="font-label italic text-[12.5px] text-on-surface-variant mt-1.5 leading-relaxed">
                              “{e.evidence_quote}”
                            </div>
                          )}
                          <div className="flex items-center gap-2 mt-1.5 font-label text-[11px] text-on-surface-variant/80">
                            {e.weight != null && (
                              <span className="font-mono">
                                w{Number(e.weight).toFixed(1)}
                              </span>
                            )}
                            {e.source && (
                              <>
                                <span>·</span>
                                <span className="capitalize">{e.source}</span>
                              </>
                            )}
                            <span>·</span>
                            <span>{timeAgo(e.created_at)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {hasActivity && (
          <div>
            <div className="eyebrow text-on-surface-variant mb-2">Recent activity</div>
            <ol className="space-y-1.5">
              {activity.map((a) => (
                <li key={a.id} className="flex items-start gap-2.5 font-label text-[12.5px] text-on-surface-variant">
                  <span className="font-mono text-[10.5px] text-on-surface-variant/60 tabular-nums w-[60px] shrink-0 mt-0.5">
                    {timeAgo(a.created_at)}
                  </span>
                  <span className="break-words leading-snug">{a.message}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {!hasSummary && !hasEntries && !hasActivity && !loading && (
          <EmptyState
            size="sm"
            icon="psychology"
            title="Nothing learned yet"
            body="Dial the lead or paste a transcript — the agent will start writing insights here automatically."
          />
        )}
      </div>
    </div>
  );
}
