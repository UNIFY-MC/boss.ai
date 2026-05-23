import { callClaudeJSON } from '../../llm/client';
import { supabase } from '../../lib/supabase';
import { logActivity } from '../../lib/activity-log';
import type { ConsequenceChain, PipelineContext } from '../types';

const MAX_CHAINS = 6;

/**
 * Build consequence chains from high-signal events, using the vertical's
 * chain_builder_persona for expert framing. This is the heart of the
 * Reasoning axis — the agent visibly thinks like a domain expert.
 */
export async function buildChains(ctx: PipelineContext): Promise<void> {
  if (ctx.relevant_signals.length === 0) {
    ctx.chains = [];
    return;
  }

  const persona = ctx.vertical.config.chain_builder_persona;
  const system = `${persona}

OUTPUT REQUIREMENTS:
Build up to ${MAX_CHAINS} consequence chains. For each, return:
{
  "event": "the specific real-world event you are reasoning from",
  "cascading_effects": ["first-order effect", "second-order effect", "third-order effect"],
  "charter_trigger": "the precise condition that creates urgency for our target ICP",
  "target_profile": "the kind of company we should call today, in 1 sentence",
  "urgency": "high" | "medium" | "low",
  "apollo_search_hint": {
    "person_titles": ["title 1", "title 2"],
    "locations": ["country", "country"],
    "q_keywords": "keyword phrase for Apollo organization filter"
  },
  "source_signal_title": "the exact title of the input signal you used"
}

Return a JSON array of chain objects, no other text, no markdown fences.
You are NOT writing scripts. You are NOT calling Apollo. Just the chains.`;

  const user =
    `Today's high-signal events for ${ctx.vertical.display_name}:\n\n` +
    ctx.relevant_signals
      .map((s, i) => `[${i + 1}] ${s.title} — ${s.description?.slice(0, 300) ?? ''} (${s.source_name})`)
      .join('\n');

  let chains: ConsequenceChain[] = [];
  try {
    chains = await callClaudeJSON<ConsequenceChain[]>({
      system,
      user,
      maxTokens: 6000,
      temperature: 0.4,
    });
    if (!Array.isArray(chains)) chains = [];
  } catch (err) {
    await logActivity({
      run_id: ctx.run_id,
      vertical_id: ctx.vertical_id,
      type: 'error',
      message: `❌ Chain builder failed: ${(err as Error).message}`,
    });
    chains = [];
  }

  ctx.chains = chains.slice(0, MAX_CHAINS);

  // Persist chains on the run row + log each chain as a sub-event for streaming UI
  await supabase().from('runs').update({ chains: ctx.chains as unknown as object }).eq('id', ctx.run_id);

  for (const [i, c] of ctx.chains.entries()) {
    await logActivity({
      run_id: ctx.run_id,
      vertical_id: ctx.vertical_id,
      type: 'chain_event',
      message: `🔗 Chain ${i + 1}: ${c.event}`,
      metadata: c as unknown as Record<string, unknown>,
    });
  }

  await logActivity({
    run_id: ctx.run_id,
    vertical_id: ctx.vertical_id,
    type: 'agent_step',
    message: `🧩 Built ${ctx.chains.length} consequence chains`,
  });
}
