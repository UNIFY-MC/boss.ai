import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import { logActivity } from '../lib/activity-log';
import { runPipeline } from '../pipeline/orchestrate';

const RunBody = z.object({
  run_id: z.string().uuid(),
  vertical_id: z.string().uuid(),
  triggered_by: z.enum(['manual', 'cron', 'demo']).default('manual'),
});

/**
 * POST /run — start a pipeline run.
 *
 * Returns 202 immediately with run_id; orchestrator runs async, streams its
 * reasoning to activity_log so the cockpit's Supabase Realtime subscription
 * picks it up live.
 */
export async function runRoute(app: FastifyInstance) {
  app.post('/run', async (req, reply) => {
    const parsed = RunBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'invalid_body', details: parsed.error.format() });
    }
    const { run_id, vertical_id, triggered_by } = parsed.data;

    // Guard against concurrent runs for the same vertical
    const { data: inflight } = await supabase()
      .from('runs')
      .select('id')
      .eq('vertical_id', vertical_id)
      .eq('status', 'running')
      .limit(1);
    if (inflight && inflight.length > 0) {
      return reply.code(409).send({ error: 'run_in_progress', run_id: inflight[0].id });
    }

    // Mark queued → running. Caller already created the runs row; we just flip it.
    await supabase()
      .from('runs')
      .update({ status: 'running', started_at: new Date().toISOString(), triggered_by })
      .eq('id', run_id);

    await logActivity({
      run_id,
      vertical_id,
      type: 'agent_step',
      message: `▶ Run started (${triggered_by})`,
    });

    // Fire-and-forget pipeline
    void runPipeline(run_id, vertical_id).catch((err) => {
      app.log.error({ err, run_id }, 'pipeline crashed');
    });

    return reply.code(202).send({ run_id, status: 'accepted' });
  });
}
