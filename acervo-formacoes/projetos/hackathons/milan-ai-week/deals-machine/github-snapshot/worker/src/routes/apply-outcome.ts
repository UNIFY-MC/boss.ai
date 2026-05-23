// POST /apply-outcome — closes the loop between a call outcome and the
// brain entries that fed the playbook used.
//
// Body: { lead_id, outcome }
//   outcome ∈ meeting_set | qualified_interest | objection_unhandled |
//             killed | closed_won | closed_lost | follow_up_needed
//
// Effect: for each brain entry credited to a section of the playbook used
// on this lead's most recent call, bump its weight up or down based on the
// outcome's signal. Auto-regen the playbook so the next call benefits.

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import { logActivity } from '../lib/activity-log';
import { scheduleAutoRegen } from '../playbook/generate';

const Body = z.object({
  lead_id: z.string().uuid(),
  outcome: z.enum([
    'meeting_set',
    'qualified_interest',
    'objection_unhandled',
    'killed',
    'closed_won',
    'closed_lost',
    'follow_up_needed',
  ]),
});

// Signal multipliers: how much to bump brain entry weights.
const SIGNAL_DELTA: Record<string, number> = {
  meeting_set:         +0.3,
  qualified_interest:  +0.15,
  closed_won:          +0.5,
  follow_up_needed:    0,
  objection_unhandled: -0.1,
  killed:              -0.2,
  closed_lost:         -0.15,
};

const MIN_WEIGHT = 0.3;
const MAX_WEIGHT = 2.5;

export async function applyOutcomeRoute(app: FastifyInstance) {
  app.post('/apply-outcome', async (req, reply) => {
    const parsed = Body.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'invalid_body', issues: parsed.error.issues });
    }
    const { lead_id, outcome } = parsed.data;
    const delta = SIGNAL_DELTA[outcome] ?? 0;
    if (delta === 0) {
      return reply.send({ ok: true, updated: 0, reason: 'neutral_outcome' });
    }
    const sb = supabase();

    // Find the most recent call for this lead
    const { data: call } = await sb
      .from('calls')
      .select('id, vertical_id, playbook_snapshot')
      .eq('lead_id', lead_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!call?.playbook_snapshot) {
      return reply.send({ ok: true, updated: 0, reason: 'no_playbook_snapshot' });
    }

    // Collect the playbook_credit refs from the snapshot we want to credit/discount.
    // For positive: bump all sections that were "used" — which we approximate as
    // the top-weighted angle, all asks, opener variant picked. The actual sections
    // touched live in `live_coaching_events.playbook_ref` if Phase 6 ran.
    const playbook = call.playbook_snapshot as {
      opener_variants?: Array<{ id: string }>;
      angles?: Array<{ id: string }>;
      objections?: Array<{ id: string }>;
      asks?: Array<{ id: string }>;
    };

    const credits: string[] = [];
    for (const a of playbook.angles || []) credits.push(`angle.${a.id}`);
    for (const o of playbook.objections || []) credits.push(`objection.${o.id}`);

    // Update brain entries by playbook_credit
    if (credits.length === 0) {
      return reply.send({ ok: true, updated: 0, reason: 'no_credits' });
    }

    const { data: entries } = await sb
      .from('brain_entries')
      .select('id, weight')
      .in('playbook_credit', credits);

    let updated = 0;
    for (const e of entries || []) {
      const w = Math.max(MIN_WEIGHT, Math.min(MAX_WEIGHT, (Number(e.weight) || 1) + delta));
      await sb
        .from('brain_entries')
        .update({
          weight: w,
          last_outcome_signal: outcome,
          last_outcome_signal_at: new Date().toISOString(),
        })
        .eq('id', e.id);
      updated++;
    }

    await logActivity({
      lead_id,
      vertical_id: call.vertical_id,
      type: 'info',
      message: `Outcome '${outcome}' → ${delta > 0 ? '+' : ''}${delta} weight on ${updated} brain entries`,
      metadata: { kind: 'outcome_applied', outcome, delta, updated },
    });

    // Auto-regen so the playbook reflects the new weights on the next call
    if (updated > 0) scheduleAutoRegen(call.vertical_id);

    return reply.send({ ok: true, updated, delta });
  });
}
