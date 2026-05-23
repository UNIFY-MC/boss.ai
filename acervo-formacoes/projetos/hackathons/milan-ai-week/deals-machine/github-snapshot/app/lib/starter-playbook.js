// Starter playbook — a fully-formed cold-call playbook that works without
// any brain entries. Used as the onboarding default for new users who don't
// yet have call history to learn from. Once they've made some calls, they can
// "Compose from brain" to get a playbook tuned to their actual outcomes.
//
// Shape matches what worker/src/playbook/generate.ts produces — drop-in
// compatible with ScriptCard.

export const STARTER_PLAYBOOK = {
  opener_variants: [
    {
      id: "cold_no_context",
      text:
        "Hi {{first}}, this is {{caller_first}}. Quick reason for the call — and I'll be respectful of your time. Got 30 seconds?",
      trigger_hint: "no recent signal",
    },
    {
      id: "trigger_funding",
      text:
        "Hi {{first}}, this is {{caller_first}}. Saw the recent funding — congrats. The reason I'm calling: {{pain_point}}. Worth a quick 90 seconds?",
      trigger_hint: "raised seed/A/B/C in last 90 days",
    },
    {
      id: "trigger_hiring_spree",
      text:
        "Hi {{first}}, {{caller_first}} here. Noticed you're hiring fast at {{company}}. Most teams in that mode hit the same bottleneck around onboarding — happy to share what's worked. Got a minute?",
      trigger_hint: "posted 3+ roles",
    },
    {
      id: "trigger_competitor",
      text:
        "Hi {{first}}, {{caller_first}} here. Quick one — saw the news on your space last week. Curious how you're thinking about it. Got 60 seconds?",
      trigger_hint: "competitor news",
    },
    {
      id: "referral",
      text:
        "Hi {{first}}, this is {{caller_first}} — {{referrer}} suggested I reach out. They mentioned {{pain_point}} is on your radar. Worth a quick chat?",
      trigger_hint: "warm intro",
    },
  ],
  angles: [
    {
      id: "angle_time_saved",
      text:
        "Most {{title}}s lose 8-12 hours a week to manual {{pain_point}}. That's where teams in your space see the fastest ROI.",
      weight: 1.2,
      source_entry_ids: [],
    },
    {
      id: "angle_revenue_leak",
      text:
        "When {{pain_point}} slips, it usually shows up as missed pipeline. Worth catching before it compounds.",
      weight: 1.0,
      source_entry_ids: [],
    },
    {
      id: "angle_peer_signal",
      text:
        "We're seeing teams at your size {{industry}} prioritize this in Q1 — happy to share what's actually working vs what's hype.",
      weight: 0.9,
      source_entry_ids: [],
    },
  ],
  objections: [
    {
      id: "not_a_priority",
      trigger: "this isn't a priority right now",
      rebuttal:
        "Fair — and I'm not asking you to make it one today. 10 minutes to compare notes, no pitch. If it's a fit, great. If not, you've got intel for when it does become a priority.",
      source_entry_ids: [],
    },
    {
      id: "send_info",
      trigger: "just send me some info",
      rebuttal:
        "Happy to — but the deck's generic and you'll skim it. 7 minutes on a call lets me tailor it to {{company}} so you actually get value. Tuesday or Wednesday?",
      source_entry_ids: [],
    },
    {
      id: "pricing",
      trigger: "what does it cost",
      rebuttal:
        "Depends on scope, but ballpark is below what most teams spend on the problem already. Want me to walk through how the pricing works on a quick call?",
      source_entry_ids: [],
    },
    {
      id: "happy_with_current",
      trigger: "we already use something for this",
      rebuttal:
        "Makes sense — most teams I talk to do. What we usually hear is that the current tool covers 70% and the gap is where pipeline leaks. Worth a 10-minute check?",
      source_entry_ids: [],
    },
    {
      id: "wrong_person",
      trigger: "you should talk to someone else",
      rebuttal:
        "Appreciate the steer. Who's the right person, and would you mind a quick intro? I'll keep it short and credit you.",
      source_entry_ids: [],
    },
  ],
  asks: [
    {
      id: "zoom_15",
      text: "15-minute Zoom this week — Tuesday or Thursday afternoon work?",
      primary: true,
    },
    {
      id: "intro_pm",
      text: "Quick email intro to whoever owns this on your side.",
      primary: false,
    },
    {
      id: "send_one_pager",
      text: "I'll send a one-pager — anything specific you want me to address?",
      primary: false,
    },
  ],
  avoid: [
    "Don't lead with the product. Lead with the prospect's situation.",
    "Don't pitch on voicemail — leave a reason to call back, not a sales pitch.",
    "Don't say 'circle back', 'touch base', or 'value prop'.",
    "Don't ask 'is now a good time?' — assume yes, deliver the hook in 8 seconds.",
    "Don't oversell the meeting. 15 minutes, specific agenda.",
  ],
  voicemail_script:
    "Hi {{first}}, {{caller_first}} here — quick one about {{pain_point}} at {{company}}. Try me back at {{callback}} or I'll catch you tomorrow. Thanks.",
  pre_call_brief_template:
    "{{company}} ({{title}}). Hook: {{pain_point}}. {{trigger_event}} Goal: 15-min on calendar.",
  based_on_brain_entries: 0,
  is_starter: true,
};

// Light interpolation so starter copy doesn't read like "your {{industry}}".
// Falls back to neutral language when the vertical config doesn't have the field.
export function hydrateStarterPlaybook(verticalConfig = {}) {
  const titles = verticalConfig?.icp?.titles || [];
  const industries = verticalConfig?.icp?.industries || [];
  const painPoints = verticalConfig?.value_props || verticalConfig?.pain_points || [];
  const primaryTitle = titles[0] || "operator";
  const primaryIndustry = industries[0] || "your industry";
  const primaryPain =
    painPoints[0] ||
    verticalConfig?.icp?.primary_pain ||
    "the operational gap we keep hearing about";

  const fill = (s) =>
    (s || "")
      .replace(/\{\{title\}\}/g, primaryTitle)
      .replace(/\{\{industry\}\}/g, primaryIndustry)
      .replace(/\{\{pain_point\}\}/g, primaryPain);

  return {
    ...STARTER_PLAYBOOK,
    opener_variants: STARTER_PLAYBOOK.opener_variants.map((o) => ({
      ...o,
      text: fill(o.text),
    })),
    angles: STARTER_PLAYBOOK.angles.map((a) => ({ ...a, text: fill(a.text) })),
    objections: STARTER_PLAYBOOK.objections.map((o) => ({
      ...o,
      rebuttal: fill(o.rebuttal),
    })),
    pre_call_brief_template: fill(STARTER_PLAYBOOK.pre_call_brief_template),
  };
}
