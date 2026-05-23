// Lead outcome → brain_entries auto-write.
//
// When the user tags a lead with one of the 5 outcome buttons, we record
// a structured insight in the brain so future runs of the agent learn
// from it (e.g. "Heads of Operations at 50-200 person companies are
// not interested" → profile_avoid).
//
// Called from the leads page (and anywhere else outcomes are set).
// Same RLS-allow-all policy as the rest of the cockpit, so this writes
// directly to Supabase from the client.

import { supabase } from "./supabase";

// Maps cockpit outcome buttons → worker apply-outcome signal.
// Drives the playbook brain-entry weight feedback loop.
const OUTCOME_TO_WORKER_SIGNAL = {
  positive:   "meeting_set",
  negative:   "killed",
  gatekeeper: "follow_up_needed",
  callback:   "qualified_interest",
  follow_up:  "qualified_interest",
};

async function applyOutcomeToPlaybook(lead, outcome) {
  if (!lead?.id) return;
  const signal = OUTCOME_TO_WORKER_SIGNAL[outcome];
  if (!signal || signal === "follow_up_needed") return;
  try {
    await fetch("/api/apply-outcome", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ lead_id: lead.id, outcome: signal }),
    });
  } catch (err) {
    // Fail silently — outcome → weight bump is best-effort.
    console.warn("[apply-outcome] proxy failed:", err);
  }
}

// Map the 5 UI outcomes to brain_entry types + a default content template.
// `content` is built lazily so we can reference the lead's profile fields.
const OUTCOME_TO_BRAIN = {
  positive: {
    type: "profile_chase",
    build: (lead) => ({
      content: `${describeProfile(lead)} was interested — chase more like this`,
      weight: 1.5,
    }),
  },
  negative: {
    type: "profile_avoid",
    build: (lead) => ({
      content: `${describeProfile(lead)} was not interested`,
      weight: 1.0,
    }),
  },
  gatekeeper: {
    type: "profile_avoid",
    build: (lead) => ({
      content: `Could not reach decision-maker at ${lead.company || "this company"} — wrong contact (${lead.title || "unknown title"}). Try a different role`,
      weight: 0.8,
    }),
  },
  callback: {
    type: "commitment_made",
    build: (lead) => ({
      content: `${lead.name || "Lead"} (${lead.title || "?"} at ${lead.company || "?"}) requested a callback`,
      weight: 1.0,
    }),
  },
  follow_up: {
    type: "commitment_made",
    build: (lead) => ({
      content: `${lead.name || "Lead"} (${lead.title || "?"} at ${lead.company || "?"}) agreed to email follow-up`,
      weight: 1.0,
    }),
  },
};

function describeProfile(lead) {
  const parts = [];
  if (lead.title) parts.push(lead.title);
  if (lead.company) parts.push(`at ${lead.company}`);
  if (lead.location) parts.push(`(${lead.location})`);
  return parts.join(" ") || "Lead";
}

/**
 * Write a brain_entries row reflecting this outcome, plus an activity_log
 * line so it surfaces in the live reasoning stream.
 *
 * Returns { written: boolean, type?: string } so the caller can show a toast.
 * Dedupes by (lead_id, type, content) — re-tagging the same outcome on the
 * same lead won't multiply entries.
 */
export async function recordOutcomeInBrain(lead, outcome) {
  if (!supabase) return { written: false };
  if (!lead || !lead.vertical_id) return { written: false };
  const mapping = OUTCOME_TO_BRAIN[outcome];
  if (!mapping) return { written: false };

  const { content, weight } = mapping.build(lead);

  // Dedupe: skip if we already have an entry with the same lead+type+content
  const { data: existing } = await supabase
    .from("brain_entries")
    .select("id")
    .eq("vertical_id", lead.vertical_id)
    .eq("type", mapping.type)
    .eq("content", content)
    .limit(1);
  if (existing && existing.length > 0) {
    return { written: false, type: mapping.type, deduped: true };
  }

  const { error } = await supabase.from("brain_entries").insert({
    vertical_id: lead.vertical_id,
    lead_id: lead.id,
    type: mapping.type,
    content,
    weight,
    source: "brain",
  });
  if (error) {
    console.error("[brain-from-outcome] insert failed:", error.message);
    return { written: false, error: error.message };
  }

  // Surface in the live reasoning panel
  await supabase.from("activity_log").insert({
    vertical_id: lead.vertical_id,
    lead_id: lead.id,
    type: "chat_insight",
    message: `🧠 Brain learned (${mapping.type}): ${content}`,
  });

  // Close the loop: bump weights on playbook entries credited on this lead's
  // most recent call, then auto-regen the playbook.
  void applyOutcomeToPlaybook(lead, outcome);

  return { written: true, type: mapping.type };
}

/**
 * Untag — operator clicked the currently-active outcome a second time,
 * meaning they want to undo. Finds the brain_entries row written by
 * recordOutcomeInBrain (matching lead+type+content) and deletes it, then
 * writes a "brain reverted" activity_log line for traceability.
 *
 * Returns { reverted: boolean, type?: string }.
 */
export async function removeOutcomeFromBrain(lead, outcome) {
  if (!supabase) return { reverted: false };
  if (!lead || !lead.vertical_id) return { reverted: false };
  const mapping = OUTCOME_TO_BRAIN[outcome];
  if (!mapping) return { reverted: false };

  const { content } = mapping.build(lead);

  const { data: rows, error: findErr } = await supabase
    .from("brain_entries")
    .select("id")
    .eq("vertical_id", lead.vertical_id)
    .eq("lead_id", lead.id)
    .eq("type", mapping.type)
    .eq("content", content)
    .limit(1);
  if (findErr) {
    console.error("[brain-from-outcome] revert find failed:", findErr.message);
    return { reverted: false, error: findErr.message };
  }
  if (!rows || rows.length === 0) {
    // Nothing to revert — the entry never landed (maybe deduped earlier).
    return { reverted: false, type: mapping.type };
  }

  const { error: delErr } = await supabase
    .from("brain_entries")
    .delete()
    .eq("id", rows[0].id);
  if (delErr) {
    console.error("[brain-from-outcome] revert delete failed:", delErr.message);
    return { reverted: false, error: delErr.message };
  }

  await supabase.from("activity_log").insert({
    vertical_id: lead.vertical_id,
    lead_id: lead.id,
    type: "chat_insight",
    message: `↺ Outcome reverted — brain entry removed (${mapping.type})`,
  });

  return { reverted: true, type: mapping.type };
}
