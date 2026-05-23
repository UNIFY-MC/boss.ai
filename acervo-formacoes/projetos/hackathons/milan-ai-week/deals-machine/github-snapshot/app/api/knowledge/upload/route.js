// POST /api/knowledge/upload
//
// Accepts a single file (multipart/form-data) plus a target vertical_id
// and optional context note. Passes the document to Claude (native PDF
// support via document content blocks; text/md/csv as inline text),
// extracts structured brain entries, bulk-inserts into brain_entries
// with source='document'. Returns counts so the modal can confirm.

import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const CLAUDE_API = "https://api.anthropic.com/v1/messages";
const CLAUDE_MODEL = "claude-sonnet-4-5";

const VALID_TYPES = [
  "angle_landed",
  "angle_failed",
  "objection_recurring",
  "commitment_made",
  "deal_killer",
  "profile_chase",
  "profile_avoid",
  "manual_insight",
];

const MAX_FILE_BYTES = 4 * 1024 * 1024; // 4MB — keep under Vercel's 4.5MB body limit
const MAX_TEXT_CHARS = 200_000;

const SYSTEM = `You are reading a sales-related document for an outbound sales agent. Your job is to extract structured insights ("brain entries") that the agent should remember and use on future calls and email drafts.

Available brain-entry types (use these EXACT strings):
- profile_chase — describe a profile of company/role/segment that should be targeted
- profile_avoid — describe a profile of company/role/segment to avoid
- angle_landed — a framing/pitch the document says worked
- angle_failed — a framing/pitch the document says didn't work
- objection_recurring — pushback to be prepared for
- deal_killer — disqualifiers (no budget, wrong size, do-not-call, etc.)
- commitment_made — a specific past commitment (rare in documents — only use if explicitly described)
- manual_insight — actionable rule of thumb that doesn't fit anything above

For each entry, assign a weight from 0.5 (low confidence / soft hint) to 2.0 (high confidence / explicitly stated).

Rules:
- Be CONSERVATIVE. Only extract insights that are clearly load-bearing for outbound sales. An empty entries array is fine.
- One sentence per entry, max 200 characters.
- Include a verbatim quote (evidence_quote) ONLY if the document contains a clear sentence supporting the insight.
- Don't fabricate. Don't extrapolate beyond what's stated.

Return ONLY a JSON object — no prose, no markdown — with this exact shape:
{
  "entries": [
    { "type": "<one of the types>", "content": "<one-sentence insight>", "evidence_quote": "<optional verbatim quote>", "weight": 1.0 }
  ],
  "summary": "<one-sentence summary of what this document covered>"
}`;

function sbServer() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  const key = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    ""
  ).trim();
  if (!url || !key) return null;
  return createClient(url, key);
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

export async function POST(request) {
  const claudeKey = process.env.ANTHROPIC_API_KEY;
  if (!claudeKey) {
    return Response.json({ error: "ANTHROPIC_API_KEY not set" }, { status: 500 });
  }
  const sb = sbServer();
  if (!sb) {
    return Response.json({ error: "Supabase not configured" }, { status: 500 });
  }

  let form;
  try {
    form = await request.formData();
  } catch (err) {
    return Response.json({ error: `Invalid multipart body: ${err.message}` }, { status: 400 });
  }

  const file = form.get("file");
  const verticalId = form.get("vertical_id");
  const context = (form.get("context") || "").toString().trim();

  if (!file || typeof file === "string") {
    return Response.json({ error: "file field required" }, { status: 400 });
  }
  if (!verticalId || typeof verticalId !== "string") {
    return Response.json({ error: "vertical_id required" }, { status: 400 });
  }

  const filename = file.name || "document";
  const mimeType = file.type || "";
  const isPdf = mimeType === "application/pdf" || filename.toLowerCase().endsWith(".pdf");

  const bytes = Buffer.from(await file.arrayBuffer());
  if (bytes.length === 0) {
    return Response.json({ error: "Empty file" }, { status: 400 });
  }
  if (bytes.length > MAX_FILE_BYTES) {
    return Response.json(
      { error: `File too large (${bytes.length} bytes; max ${MAX_FILE_BYTES}).` },
      { status: 400 }
    );
  }

  // Build Claude user message
  const userContent = [];
  if (isPdf) {
    userContent.push({
      type: "document",
      source: {
        type: "base64",
        media_type: "application/pdf",
        data: bytes.toString("base64"),
      },
    });
  } else {
    const text = bytes.toString("utf-8");
    if (text.length > MAX_TEXT_CHARS) {
      return Response.json(
        { error: `Text content too long (${text.length} chars; max ${MAX_TEXT_CHARS}).` },
        { status: 400 }
      );
    }
    userContent.push({
      type: "text",
      text: `Filename: ${filename}\n\n--- DOCUMENT CONTENT ---\n${text}\n--- END DOCUMENT ---`,
    });
  }
  userContent.push({
    type: "text",
    text: context
      ? `\nContext from the operator: "${context}"\n\nExtract brain entries now.`
      : "\nExtract brain entries now.",
  });

  let claudeRes;
  try {
    claudeRes = await fetch(CLAUDE_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": claudeKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 4000,
        system: SYSTEM,
        messages: [{ role: "user", content: userContent }],
      }),
    });
  } catch (err) {
    return Response.json({ error: `Claude API request failed: ${err.message}` }, { status: 500 });
  }

  if (!claudeRes.ok) {
    const text = await claudeRes.text();
    return Response.json(
      { error: `Claude API ${claudeRes.status}: ${text.slice(0, 300)}` },
      { status: 500 }
    );
  }
  const data = await claudeRes.json();
  const raw = (data.content || [])
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n");
  const parsed = extractJSON(raw);

  if (!parsed?.entries || !Array.isArray(parsed.entries)) {
    return Response.json(
      { error: "Claude did not return a valid entries array", raw: raw.slice(0, 500) },
      { status: 500 }
    );
  }

  const rows = parsed.entries
    .filter((e) => e?.type && e?.content && VALID_TYPES.includes(e.type))
    .slice(0, 100)
    .map((e) => ({
      vertical_id: verticalId,
      type: e.type,
      content: String(e.content).slice(0, 500),
      evidence_quote: e.evidence_quote ? String(e.evidence_quote).slice(0, 500) : null,
      weight: Math.max(0.5, Math.min(2.0, Number(e.weight) || 1.0)),
      source: "document",
    }));

  if (rows.length === 0) {
    return Response.json({
      inserted: 0,
      summary: parsed.summary || "No actionable insights extracted.",
      types_seen: [],
    });
  }

  const { error: insErr } = await sb.from("brain_entries").insert(rows);
  if (insErr) {
    return Response.json({ error: `Insert failed: ${insErr.message}` }, { status: 500 });
  }

  await sb.from("activity_log").insert({
    vertical_id: verticalId,
    type: "info",
    message: `📄 Document "${filename}" ingested — ${rows.length} brain entries extracted`,
  });

  return Response.json({
    inserted: rows.length,
    summary: parsed.summary || `Extracted ${rows.length} insights.`,
    types_seen: [...new Set(rows.map((r) => r.type))],
  });
}
