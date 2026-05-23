import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import Anthropic from '@anthropic-ai/sdk';
import { env } from '../lib/env';
import { supabase } from '../lib/supabase';
import { loadVertical } from '../pipeline/load-vertical';
import { logActivity } from '../lib/activity-log';
import { detectChatInsight } from '../brain/chat-insight';
import { checkInput } from '../llm/lobster-trap';
import { CLAUDE_MODEL } from '../llm/client';

const ChatBody = z.object({
  vertical_id: z.string().uuid(),
  message: z.string().min(1),
  history: z
    .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string() }))
    .default([]),
});

const BRAIN_CONTEXT_LIMIT = 15;
const RECENT_LEADS_LIMIT = 10;
const RECENT_RUN_LOOKBACK_DAYS = 7;

/**
 * POST /chat — operator interrogates the Brain conversationally (SSE).
 *
 * Pre-flights message through Lobster Trap. Streams Claude tokens back via SSE.
 * After response completes, async-detects whether the operator stated a strategic
 * insight; if so, inserts a brain_entries row type='manual_insight'.
 */
export async function chatRoute(app: FastifyInstance) {
  app.post('/chat', async (req, reply) => {
    const parsed = ChatBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'invalid_body', details: parsed.error.format() });
    }
    const { vertical_id, message, history } = parsed.data;

    // Pre-flight: even though operator is trusted, defense-in-depth.
    const verdict = await checkInput(message);
    if (verdict.verdict === 'flagged') {
      return reply.code(400).send({ error: 'security_flagged', verdict });
    }

    let vertical;
    try {
      vertical = await loadVertical(vertical_id);
    } catch {
      return reply.code(404).send({ error: 'vertical_not_found' });
    }

    // Load Brain context + recent leads + recent runs
    const since = new Date(Date.now() - RECENT_RUN_LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const [{ data: brainRows }, { data: leadRows }, { data: runRows }] = await Promise.all([
      supabase()
        .from('brain_entries')
        .select('type, content, weight, created_at')
        .eq('vertical_id', vertical_id)
        .is('decayed_at', null)
        .order('weight', { ascending: false })
        .limit(BRAIN_CONTEXT_LIMIT),
      supabase()
        .from('leads')
        .select('id, name, title, company, status, pain_level, memory_summary')
        .eq('vertical_id', vertical_id)
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(RECENT_LEADS_LIMIT),
      supabase()
        .from('runs')
        .select('id, status, started_at, summary, chains')
        .eq('vertical_id', vertical_id)
        .order('started_at', { ascending: false })
        .limit(3),
    ]);

    const brainCtx = (brainRows ?? [])
      .map((b) => `- [${b.type} w${(b.weight as number).toFixed(2)}] ${b.content}`)
      .join('\n');
    const leadCtx = (leadRows ?? [])
      .map((l) => `- ${l.name ?? '(unknown)'} — ${l.title ?? ''} @ ${l.company ?? ''} (${l.status}, ${l.pain_level ?? '-'}) ${l.memory_summary ? `— ${l.memory_summary}` : ''}`)
      .join('\n');
    const runCtx = (runRows ?? [])
      .map((r) => `- ${r.started_at} (${r.status}) — ${r.summary ?? ''}`)
      .join('\n');

    const system = `You are the operator's intelligence partner for the "${vertical.display_name}" sales pipeline.
You answer questions about: market signals, lead patterns, what's working, what's not, who to chase, who to avoid.

You have access to the operator's recent activity:

BRAIN (last 30 days, top by weight):
${brainCtx || '(empty — first runs)'}

RECENT LEADS (last 7 days, top 10):
${leadCtx || '(none yet)'}

RECENT RUNS:
${runCtx || '(no runs yet)'}

VERTICAL VOICE TO MATCH:
- Tone: ${vertical.config.script_voice.tone}
- Never use: ${vertical.config.script_voice.forbidden_phrases.join(', ')}

Be concrete. Cite the brain entry, lead, or run when relevant. Don't invent.`;

    const messages: Anthropic.MessageParam[] = [
      ...history.map((h) => ({ role: h.role, content: h.content })),
      { role: 'user', content: message },
    ];

    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
    let fullResponse = '';

    try {
      const stream = await anthropic.messages.stream({
        model: CLAUDE_MODEL,
        max_tokens: 2000,
        system,
        messages,
      });

      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          const chunk = event.delta.text;
          fullResponse += chunk;
          reply.raw.write(`event: token\ndata: ${JSON.stringify({ text: chunk })}\n\n`);
        }
      }

      reply.raw.write(`event: done\ndata: ${JSON.stringify({ text: fullResponse })}\n\n`);
    } catch (err) {
      reply.raw.write(`event: error\ndata: ${JSON.stringify({ message: (err as Error).message })}\n\n`);
    } finally {
      reply.raw.end();
    }

    // Fire-and-forget: detect if user message stated an insight worth saving
    void (async () => {
      try {
        const saved = await detectChatInsight(message, { vertical_id });
        if (saved) {
          await logActivity({
            vertical_id,
            type: 'chat_insight',
            message: `💡 Brain saved insight: "${saved.content.slice(0, 120)}"`,
            metadata: { brain_entry_id: saved.id },
          });
        }
      } catch (err) {
        app.log.error({ err }, 'chat insight detection failed');
      }
    })();
  });
}
