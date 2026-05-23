// The pipeline orchestrator. Spec.md §3 — runs the 12 steps sequentially,
// writes to activity_log between each so the cockpit streams the reasoning
// live via Supabase Realtime.

import { supabase } from '../lib/supabase';
import { logActivity } from '../lib/activity-log';
import { loadVertical } from './load-vertical';
import { loadBrain } from './steps/load-brain';
import { scrapeSignals } from './steps/scrape-signals';
import { filterRelevance } from './steps/filter-relevance';
import { buildChains } from './steps/build-chains';
import { sourceApollo } from './steps/source-apollo';
import { dedupeHubSpot } from './steps/dedupe-hubspot';
import { scoreAndAssign } from './steps/score-and-assign';
import { generateScripts } from './steps/generate-scripts';
import type { PipelineContext } from './types';

export async function runPipeline(run_id: string, vertical_id: string): Promise<void> {
  // Step 1 — Read vertical config
  let vertical;
  try {
    vertical = await loadVertical(vertical_id);
  } catch (err) {
    await markRunFailed(run_id, `Vertical load failed: ${(err as Error).message}`);
    return;
  }

  await logActivity({
    run_id,
    vertical_id,
    type: 'agent_step',
    message: `📋 Vertical config loaded: ${vertical.display_name}`,
  });

  const ctx: PipelineContext = {
    run_id,
    vertical_id,
    vertical,
    brain: [],
    signals: [],
    relevant_signals: [],
    chains: [],
    apollo_results: [],
    deduped_against_hubspot: [],
    scored: [],
    scripted: [],
  };

  try {
    await loadBrain(ctx);
    await scrapeSignals(ctx);
    await filterRelevance(ctx);
    await buildChains(ctx);
    await sourceApollo(ctx);
    await dedupeHubSpot(ctx);
    await scoreAndAssign(ctx);
    await generateScripts(ctx);

    // Summarize the run
    const summary = `${ctx.scripted.length} fresh leads from ${ctx.chains.length} consequence chains (${ctx.relevant_signals.length} high-signal events scraped from ${ctx.signals.length} total).`;

    await supabase()
      .from('runs')
      .update({
        status: 'complete',
        finished_at: new Date().toISOString(),
        summary,
      })
      .eq('id', run_id);

    await logActivity({
      run_id,
      vertical_id,
      type: 'agent_step',
      message: `✅ Run complete — ${ctx.scripted.length} leads ready`,
    });
  } catch (err) {
    const msg = (err as Error).message;
    await logActivity({
      run_id,
      vertical_id,
      type: 'error',
      message: `❌ Pipeline failed: ${msg}`,
    });
    await markRunFailed(run_id, msg);
  }
}

async function markRunFailed(run_id: string, msg: string) {
  await supabase()
    .from('runs')
    .update({
      status: 'failed',
      finished_at: new Date().toISOString(),
      error_message: msg,
    })
    .eq('id', run_id);
}
