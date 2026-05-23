import { callClaudeJSON } from '../../llm/client';
import { logActivity } from '../../lib/activity-log';
import type { PipelineContext, RelevantSignal } from '../types';

const RELEVANCE_THRESHOLD = 0.55;
const BATCH_SIZE = 25;

/**
 * Score each scraped signal for relevance to the vertical's ICP, using the
 * vertical's relevance_prompt. Batched to keep Claude calls cheap.
 */
export async function filterRelevance(ctx: PipelineContext): Promise<void> {
  if (ctx.signals.length === 0) {
    ctx.relevant_signals = [];
    return;
  }

  const system = `You are a signal-relevance filter for a B2B sales agent.
For the vertical: "${ctx.vertical.display_name}"
Relevance criterion: ${ctx.vertical.config.signal_source.relevance_prompt}

ICP context:
- Target titles: ${ctx.vertical.config.icp.titles.slice(0, 6).join(', ')}…
- Countries: ${ctx.vertical.config.icp.countries.slice(0, 6).join(', ')}
- Company size: ${ctx.vertical.config.icp.company_size_range[0]}–${ctx.vertical.config.icp.company_size_range[1]}

For each input signal, return JSON: { "index": <int>, "score": <0.0–1.0>, "reason": "<one sentence>" }.
Score >= 0.6 means clearly relevant; 0.3–0.6 borderline; below 0.3 irrelevant.
Return ONLY a JSON array.`;

  const relevant: RelevantSignal[] = [];

  for (let i = 0; i < ctx.signals.length; i += BATCH_SIZE) {
    const batch = ctx.signals.slice(i, i + BATCH_SIZE);
    const user = batch
      .map(
        (s, j) =>
          `[${j}] ${s.title}${s.description ? ` — ${s.description.slice(0, 200)}` : ''}${s.source_name ? ` (${s.source_name})` : ''}`
      )
      .join('\n');

    try {
      const scored = await callClaudeJSON<Array<{ index: number; score: number; reason: string }>>({
        system,
        user,
        maxTokens: 2000,
        temperature: 0,
      });

      for (const r of scored) {
        const s = batch[r.index];
        if (!s) continue;
        if (r.score >= RELEVANCE_THRESHOLD) {
          relevant.push({ ...s, relevance_score: r.score, reason: r.reason });
        }
      }
    } catch (err) {
      await logActivity({
        run_id: ctx.run_id,
        vertical_id: ctx.vertical_id,
        type: 'error',
        message: `❌ Relevance filter batch ${i / BATCH_SIZE} failed: ${(err as Error).message}`,
      });
    }
  }

  // Sort by score
  relevant.sort((a, b) => b.relevance_score - a.relevance_score);
  // Cap at 15 for the chain-builder
  ctx.relevant_signals = relevant.slice(0, 15);

  await logActivity({
    run_id: ctx.run_id,
    vertical_id: ctx.vertical_id,
    type: 'agent_step',
    message: `🔎 Filtered: ${ctx.relevant_signals.length} high-signal events (from ${ctx.signals.length} scraped)`,
    metadata: { top_titles: ctx.relevant_signals.slice(0, 5).map((s) => s.title) },
  });
}
