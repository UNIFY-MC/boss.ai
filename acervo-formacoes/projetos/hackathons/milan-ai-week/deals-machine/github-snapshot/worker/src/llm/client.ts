// Direct Anthropic client. Use for trusted inputs only:
//   - Scraping summarization
//   - Internal reasoning steps where the agent talks to itself
//   - Script generation from our own structured data
// For untrusted text (transcripts, inbound replies, chat input) use trusted-client.ts instead.

import Anthropic from '@anthropic-ai/sdk';
import { env } from '../lib/env';

const CLAUDE_MODEL = 'claude-sonnet-4-6';

let _client: Anthropic | null = null;

function client(): Anthropic {
  if (!_client) _client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  return _client;
}

export interface CallClaudeOptions {
  system: string;
  user: string;
  maxTokens?: number;
  temperature?: number;
  webSearch?: boolean;
  model?: string;
}

/**
 * Make a single non-streaming Claude call and return the concatenated text content.
 * Throws on any non-2xx or empty response.
 */
export async function callClaude(opts: CallClaudeOptions): Promise<string> {
  const tools = opts.webSearch
    ? ([{ type: 'web_search_20250305', name: 'web_search' } as unknown] as Anthropic.Tool[])
    : undefined;

  const resp = await client().messages.create({
    model: opts.model ?? CLAUDE_MODEL,
    max_tokens: opts.maxTokens ?? 4000,
    temperature: opts.temperature ?? 0.7,
    system: opts.system,
    messages: [{ role: 'user', content: opts.user }],
    ...(tools ? { tools } : {}),
  });

  const text = resp.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n');

  if (!text) throw new Error('Empty Claude response');
  return text;
}

/**
 * Call Claude and return parsed JSON. Tries strict parse first, then strips
 * common markdown code-fence wrappers, then extracts the first JSON object
 * or array from the text. Throws if no parseable JSON is found.
 */
export async function callClaudeJSON<T = unknown>(opts: CallClaudeOptions): Promise<T> {
  const text = await callClaude(opts);
  return extractJSON<T>(text);
}

export function extractJSON<T = unknown>(text: string): T {
  // Strip Markdown fences if present
  const stripped = text
    .replace(/```json\s*/gi, '')
    .replace(/```\s*$/g, '')
    .trim();

  // Try direct parse
  try {
    return JSON.parse(stripped) as T;
  } catch {
    // fallthrough
  }

  // Extract first JSON array or object
  const arrMatch = stripped.match(/\[[\s\S]*\]/);
  const objMatch = stripped.match(/\{[\s\S]*\}/);
  const candidate = arrMatch?.[0] ?? objMatch?.[0];
  if (!candidate) throw new Error('No JSON found in Claude response');
  return JSON.parse(candidate) as T;
}

export { CLAUDE_MODEL };
