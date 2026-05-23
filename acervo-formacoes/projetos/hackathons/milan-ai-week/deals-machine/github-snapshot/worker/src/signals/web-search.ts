// Live web-search signal source.
//
// Where RSS / Reddit / Hacker News are deterministic feeds the operator
// pre-configured, this fetcher asks Claude to *go research the open web*
// for buyer-urgency events that match the vertical's ICP. The agent
// decides what to search for; we just give it the ICP + the relevance
// criterion and let it pick queries.
//
// Cost: one Claude Sonnet call per run with the web_search tool. Claude
// internally chooses to run 3-5 searches. Total ~$0.05 per run on top
// of the rest of the pipeline. Cheap relative to Apollo per-credit cost.

import { callClaude } from '../llm/client';
import type { RawSignal } from '../pipeline/types';
import type { VerticalRow } from '../pipeline/types';

const SYSTEM = `You are a sales-intelligence research agent. Your one job: search the open web for RECENT, SPECIFIC events that would create urgency for a defined ICP to take a sales call in the next 30 days.

You will be given:
- The vertical's ICP (titles, industries, countries, company size).
- The buyer-urgency relevance criterion ("Is this event likely to...").
- The reasoning persona (so you match its event-pattern preferences).

You will:
1. Decide on 4-6 specific search queries that would surface events fitting the relevance criterion. Be CONCRETE — search for specific company names, recent funding rounds, breaches, layoffs, regulatory deadlines, leadership moves, etc. — not generic phrases.
2. Run those searches via the web_search tool.
3. Extract 5-10 distinct events from the results. ONE event = one news item, post, or filing tied to a specific company/person/regulation, with a date inside the last 21 days.

Rules:
- Only include events with a real source URL.
- Skip evergreen content (how-to articles, listicles, sponsored blog posts).
- Skip events about ICP-excluded competitors (will be filtered later, but try not to waste slots).
- Prefer FRESH (last 7 days) over older events when both are relevant.
- Be honest about gaps. If a search returned nothing useful, don't fabricate events.

Return ONLY a JSON object — no markdown, no prose — with this exact shape:
{
  "queries_used": ["query 1", "query 2", "..."],
  "events": [
    {
      "title": "<headline-style summary, max 140 chars>",
      "description": "<one paragraph, what happened + why it matters to the ICP, max 400 chars>",
      "url": "<source URL>",
      "published_at": "<ISO date if known, else empty string>",
      "why_relevant": "<one sentence tying this event to the relevance criterion>"
    }
  ]
}`;

interface WebSearchResponse {
  queries_used?: string[];
  events?: Array<{
    title?: string;
    description?: string;
    url?: string;
    published_at?: string;
    why_relevant?: string;
  }>;
}

function extractJSON(text: string): WebSearchResponse | null {
  if (!text) return null;
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;
  const match = candidate.match(/\{[\s\S]*\}/m);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as WebSearchResponse;
  } catch {
    return null;
  }
}

function safeDomain(url?: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

export async function fetchWebSearch(vertical: VerticalRow, maxItems = 10): Promise<{ signals: RawSignal[]; queries: string[] }> {
  const cfg = vertical.config as {
    icp?: { titles?: string[]; industries?: string[]; countries?: string[]; company_size_range?: [number, number] };
    signal_source?: { relevance_prompt?: string };
    chain_builder_persona?: string;
  };

  const icp = cfg.icp ?? {};
  const relevance = cfg.signal_source?.relevance_prompt ?? '';
  const personaSnippet = (cfg.chain_builder_persona ?? '').slice(0, 600);

  const user = `Vertical: ${vertical.display_name}

ICP:
- Titles: ${(icp.titles ?? []).slice(0, 8).join(', ') || '—'}
- Industries: ${(icp.industries ?? []).join(', ') || '—'}
- Countries: ${(icp.countries ?? []).slice(0, 8).join(', ') || '—'}
- Company size: ${icp.company_size_range ? `${icp.company_size_range[0]}-${icp.company_size_range[1]} employees` : '—'}

Buyer-urgency relevance criterion (use this to decide what to search for):
"${relevance || '(no relevance prompt — infer from the ICP and persona)'}"

Reasoning persona (so your queries match its event-pattern preferences):
"${personaSnippet}"

Run 4-6 web searches now, then return the JSON object with up to ${maxItems} events.`;

  let raw: string;
  try {
    raw = await callClaude({
      system: SYSTEM,
      user,
      maxTokens: 4000,
      temperature: 0.3,
      webSearch: true,
    });
  } catch (err) {
    console.error('[web-search] Claude call failed:', (err as Error).message);
    return { signals: [], queries: [] };
  }

  const parsed = extractJSON(raw);
  if (!parsed || !Array.isArray(parsed.events)) {
    console.warn('[web-search] could not parse JSON response, returning empty');
    return { signals: [], queries: parsed?.queries_used ?? [] };
  }

  const signals: RawSignal[] = parsed.events
    .filter((e) => e?.title && e?.url)
    .slice(0, maxItems)
    .map((e) => {
      const domain = safeDomain(e.url) ?? 'web';
      return {
        source_name: `Web search · ${domain}`,
        title: String(e.title).slice(0, 240),
        description: [e.description, e.why_relevant].filter(Boolean).join(' — ').slice(0, 800),
        url: e.url,
        published_at: e.published_at && /\d{4}-\d{2}-\d{2}/.test(e.published_at) ? e.published_at : undefined,
        raw: {
          web_search: true,
          why_relevant: e.why_relevant ?? null,
          queries_used: parsed.queries_used ?? [],
        },
      } satisfies RawSignal;
    });

  return { signals, queries: parsed.queries_used ?? [] };
}
