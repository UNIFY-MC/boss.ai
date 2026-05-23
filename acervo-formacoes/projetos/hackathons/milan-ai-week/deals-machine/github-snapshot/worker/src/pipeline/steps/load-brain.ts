import { supabase } from '../../lib/supabase';
import type { BrainEntry, PipelineContext } from '../types';
import { logActivity } from '../../lib/activity-log';

const BRAIN_WINDOW_DAYS = 30;
const PER_TYPE_LIMIT = 20;

export async function loadBrain(ctx: PipelineContext): Promise<void> {
  const since = new Date(Date.now() - BRAIN_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase()
    .from('brain_entries')
    .select('id, type, content, weight, source')
    .eq('vertical_id', ctx.vertical_id)
    .is('decayed_at', null)
    .gte('created_at', since)
    .order('weight', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) {
    await logActivity({
      run_id: ctx.run_id,
      vertical_id: ctx.vertical_id,
      type: 'error',
      message: `❌ Failed to load Brain: ${error.message}`,
    });
    ctx.brain = [];
    return;
  }

  // Cap per-type so a runaway type doesn't dominate
  const byType = new Map<string, BrainEntry[]>();
  for (const row of (data ?? []) as BrainEntry[]) {
    const arr = byType.get(row.type) ?? [];
    if (arr.length < PER_TYPE_LIMIT) arr.push(row);
    byType.set(row.type, arr);
  }
  ctx.brain = [...byType.values()].flat();

  const typeBreakdown = [...byType.entries()]
    .map(([t, items]) => `${t}: ${items.length}`)
    .join(', ');

  await logActivity({
    run_id: ctx.run_id,
    vertical_id: ctx.vertical_id,
    type: 'agent_step',
    message: `🧠 Loaded ${ctx.brain.length} brain insights (last ${BRAIN_WINDOW_DAYS}d)${typeBreakdown ? ` — ${typeBreakdown}` : ''}`,
  });
}
