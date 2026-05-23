// POST /api/email
//
// Vertical-aware follow-up email: drafts via Claude, sends via Resend.
// Replaces the legacy FlyFX-hardcoded path. The agent-pipeline leads table
// uses flat fields (name, company, title) — not the legacy lead.first_name.
//
// Actions:
//   draft  { lead_id }                              -> { subject, body }
//   refine { current: {subject, body}, instruction } -> { subject, body }
//   send   { lead_id, subject, body, from?, to? }    -> { sent, resendId }

import { createClient } from "@supabase/supabase-js";
import { decryptSecret } from "@/app/lib/credentials-crypto";
import { sendViaGmail } from "@/app/lib/gmail-sender";

export const maxDuration = 60;

const CLAUDE_API = "https://api.anthropic.com/v1/messages";
const CLAUDE_MODEL = "claude-sonnet-4-5";

function sbServer() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim();
  if (!url || !key) return null;
  return createClient(url, key);
}

async function callClaude(system, prompt, apiKey) {
  const res = await fetch(CLAUDE_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 1500,
      system,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Claude API failed: ${res.status} ${err.slice(0, 200)}`);
  }
  const data = await res.json();
  return (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n");
}

function extractJSON(text) {
  if (!text) return null;
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;
  const match = candidate.match(/\{[\s\S]*\}/m);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

const DRAFT_SYSTEM = `You are drafting a follow-up email after a sales conversation, in the voice of a specific outbound vertical.

Rules:
- Match the vertical's tone (provided in the prompt).
- Short: 80–120 words for the body.
- Open with one line that references the recipient by name and a real, specific reason for reaching out — drawn from the lead's profile, the agent's memory_summary if any, or the vertical's outreach angle.
- Single, concrete next step at the end (15-min intro, specific data send, etc.).
- Never use these words: amazing, awesome, incredible, seamless, cutting-edge, game-changer, revolutionary, synergy, leverage.
- Don't claim pricing or specific outcomes.
- Sign off with the sender's name and the company name as given.
- Plain text only — no markdown, no HTML.

Return ONLY a JSON object with keys "subject" and "body". No prose around it.`;

const REFINE_SYSTEM = `You are editing a follow-up email. Apply the user's instruction precisely. Preserve the tone and structure unless the instruction asks to change them. Return ONLY a JSON object with keys "subject" and "body".`;

async function loadLeadContext(leadId) {
  const sb = sbServer();
  if (!sb) throw new Error("Supabase not configured");
  const { data: lead, error: leadErr } = await sb
    .from("leads")
    .select("id, vertical_id, run_id, name, title, company, location, phone, email, domain, status, memory_summary")
    .eq("id", leadId)
    .maybeSingle();
  if (leadErr) throw new Error(`Lead lookup failed: ${leadErr.message}`);
  if (!lead) throw new Error(`Lead ${leadId} not found`);

  const { data: vertical } = await sb
    .from("verticals")
    .select("id, slug, display_name, config")
    .eq("id", lead.vertical_id)
    .maybeSingle();

  return { lead, vertical };
}

function buildDraftPrompt({ lead, vertical, senderName, senderCompany }) {
  const voice = vertical?.config?.voice || {};
  const angle = vertical?.config?.outreach_angle || "";
  const lines = [
    `VERTICAL: ${vertical?.display_name || "—"}`,
    `VOICE/TONE: ${voice.tone || "professional, direct"}`,
    voice.dos?.length ? `DO: ${voice.dos.join("; ")}` : null,
    voice.donts?.length ? `DON'T: ${voice.donts.join("; ")}` : null,
    angle ? `OUTREACH ANGLE: ${angle}` : null,
    "",
    `RECIPIENT: ${lead.name || "Unknown"} — ${lead.title || "?"} at ${lead.company || "?"}`,
    lead.location ? `LOCATION: ${lead.location}` : null,
    lead.email ? `EMAIL: ${lead.email}` : null,
    "",
    lead.memory_summary
      ? `WHAT THE AGENT REMEMBERS ABOUT THIS LEAD: "${lead.memory_summary}"`
      : `NO PRIOR CONVERSATION CONTEXT — this is a first-touch follow-up.`,
    "",
    `SENDER: ${senderName}, ${senderCompany}`,
    "",
    `Return JSON: { "subject": "...", "body": "..." }`,
  ].filter(Boolean);
  return lines.join("\n");
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { action } = body;
  const claudeKey = process.env.ANTHROPIC_API_KEY;
  const resendKey = process.env.RESEND_API_KEY;
  const senderName = process.env.OPERATOR_NAME || "The Deals Machine team";
  const senderCompany = process.env.OPERATOR_COMPANY || "Deals Machine";
  const defaultFrom =
    process.env.RESEND_FROM || "Deals Machine <onboarding@resend.dev>";

  try {
    if (action === "draft") {
      if (!claudeKey) return Response.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
      if (!body.lead_id) return Response.json({ error: "lead_id required" }, { status: 400 });

      const { lead, vertical } = await loadLeadContext(body.lead_id);
      const prompt = buildDraftPrompt({ lead, vertical, senderName, senderCompany });
      const raw = await callClaude(DRAFT_SYSTEM, prompt, claudeKey);
      const draft = extractJSON(raw);
      if (!draft || !draft.subject || !draft.body) {
        return Response.json({
          email: {
            subject: `Following up — ${lead.company || lead.name || ""}`.trim(),
            body: `Hi ${lead.name?.split(" ")[0] || "there"},\n\nThanks for the conversation. Wanted to follow up on what we discussed. Let me know a good time for a quick 15-minute call this week.\n\n${senderName}\n${senderCompany}`,
          },
          fallback: true,
        });
      }
      return Response.json({ email: draft, lead });
    }

    if (action === "refine") {
      if (!claudeKey) return Response.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
      const { current, instruction } = body;
      if (!current?.subject || !current?.body) return Response.json({ error: "current.subject and current.body required" }, { status: 400 });
      if (!instruction) return Response.json({ error: "instruction required" }, { status: 400 });

      const prompt = `Current draft:
Subject: ${current.subject}
Body:
${current.body}

User instruction: "${instruction}"

Return JSON: { "subject": "...", "body": "..." }`;
      const raw = await callClaude(REFINE_SYSTEM, prompt, claudeKey);
      const draft = extractJSON(raw);
      return Response.json({ email: draft || current });
    }

    if (action === "send") {
      const { lead_id, subject, body: emailBody, from, draft_id } = body;
      let to = body.to;
      let lead = null;
      let vertical_id = null;

      if (lead_id) {
        const ctx = await loadLeadContext(lead_id);
        lead = ctx.lead;
        vertical_id = lead.vertical_id;
        if (!to) to = lead.email;
      }
      if (!to) return Response.json({ error: "No recipient email" }, { status: 400 });
      if (!subject || !emailBody) return Response.json({ error: "subject and body required" }, { status: 400 });

      // Preferred sender: the operator's connected Gmail account. Falls back
      // to Resend only if no Gmail connection exists.
      const sb = sbServer();
      let gmailCred = null;
      if (sb) {
        const { data } = await sb
          .from("operator_credentials")
          .select("email, display_name, refresh_token_encrypted")
          .eq("provider", "gmail")
          .maybeSingle();
        if (data) gmailCred = data;
      }

      let sendResult;
      let via;
      let senderAddress;

      if (gmailCred) {
        try {
          const refreshToken = decryptSecret(gmailCred.refresh_token_encrypted);
          const gmailRes = await sendViaGmail({
            refreshToken,
            fromEmail: gmailCred.email,
            fromName: gmailCred.display_name || senderName,
            to,
            subject,
            body: emailBody,
          });
          sendResult = { messageId: gmailRes.messageId };
          via = "gmail";
          senderAddress = gmailCred.email;
        } catch (err) {
          return Response.json(
            { error: `Gmail send failed: ${err.message}` },
            { status: 500 }
          );
        }
      } else {
        if (!resendKey) {
          return Response.json(
            {
              error:
                "No sender configured. Connect Gmail in Settings, or set RESEND_API_KEY.",
            },
            { status: 500 }
          );
        }
        const { Resend } = await import("resend");
        const resend = new Resend(resendKey);
        const { data, error } = await resend.emails.send({
          from: from || defaultFrom,
          to: [to],
          subject,
          text: emailBody,
        });
        if (error) {
          return Response.json(
            { error: error.message || "Resend send failed" },
            { status: 500 }
          );
        }
        sendResult = { resendId: data?.id };
        via = "resend";
        senderAddress = from || defaultFrom;
      }

      // Post-send side-effects: status bump + activity log + mark draft sent
      if (sb && lead_id) {
        const terminal = ["positive", "negative", "in_hubspot", "deleted"];
        if (lead && !terminal.includes(lead.status)) {
          await sb
            .from("leads")
            .update({ status: "follow_up", updated_at: new Date().toISOString() })
            .eq("id", lead_id);
        }
        if (vertical_id) {
          await sb.from("activity_log").insert({
            vertical_id,
            lead_id,
            type: "info",
            message: `📧 Follow-up sent to ${lead?.name || to} via ${via} (${senderAddress}) — "${subject.slice(0, 80)}"`,
          });
        }

        // If the operator sent a pre-drafted email, mark that draft as sent.
        // Otherwise, mark any ready drafts for this lead as discarded so the
        // "Draft ready" badge clears.
        if (draft_id) {
          await sb
            .from("email_drafts")
            .update({
              status: "sent",
              sent_at: new Date().toISOString(),
              gmail_message_id: via === "gmail" ? sendResult.messageId : null,
              resend_id: via === "resend" ? sendResult.resendId : null,
            })
            .eq("id", draft_id);
        } else {
          await sb
            .from("email_drafts")
            .update({ status: "discarded" })
            .eq("lead_id", lead_id)
            .eq("status", "ready");
        }
      }

      return Response.json({ sent: true, via, from: senderAddress, ...sendResult });
    }

    return Response.json({ error: "Unknown action. Use: draft, refine, send" }, { status: 400 });
  } catch (err) {
    return Response.json({ error: err.message || String(err) }, { status: 500 });
  }
}
