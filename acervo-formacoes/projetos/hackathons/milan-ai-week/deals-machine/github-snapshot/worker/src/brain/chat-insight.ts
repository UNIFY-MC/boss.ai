// Post-chat classifier — detect if the operator's message contained a strategic
// insight worth storing in the Brain.
//
// Runs after each chat exchange. Returns either null (no insight) or a typed
// insight payload that gets inserted as brain_entry type='manual_insight'.

import { z } from 'zod';
import { callClaudeTrustedJSON } from '../llm/trusted-client';
import { supabase } from '../lib/supabase';

const Result = z.union([
  z.null(),
  z.object({
    content: z.string().min(8),
    reasoning: z.string().optional(),
  }),
]);

const SYSTEM = `You are a Brain-insight detector for a B2B sales agent. Given the
operator's last message in a chat, decide whether it contains a DURABLE strategic
insight worth remembering across future runs.

Examples of insights worth saving:
- "Series A founders in Italy are converting much better than France"
- "Skip CTOs at companies under 20 people — they're always too busy"
- "The 'AI talent flight' angle is landing this week"

NOT insights:
- Questions or requests for info
- One-off observations about a single call
- General chit-chat

Return JSON:
- null  (if no insight)
- { "content": "<the rewritten insight, 1-2 sentences>", "reasoning": "<one sentence why>" }

Return ONLY the JSON value.`;

export async function detectChatInsight(
  message: string,
  ctx: { vertical_id: string; chat_id?: string }
): Promise<{ id: string; content: string } | null> {
  try {
    const raw = await callClaudeTrustedJSON({
      system: SYSTEM,
      user: message,
      maxTokens: 400,
      temperature: 0,
      untrustedText: message,
      ctx: { source_type: 'chat', source_ref: ctx.chat_id ?? null, vertical_id: ctx.vertical_id },
    });
    const parsed = Result.parse(raw);
    if (!parsed) return null;

    const { data, error } = await supabase()
      .from('brain_entries')
      .insert({
        vertical_id: ctx.vertical_id,
        type: 'manual_insight',
        content: parsed.content,
        evidence_quote: message.length > 280 ? message.slice(0, 280) + '…' : message,
        weight: 1.0,
        source: 'brain',
      })
      .select('id, content')
      .single();
    if (error || !data) return null;
    return data;
  } catch {
    return null;
  }
}
