import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import { initiateBridge, isTwilioConfigured } from '../telephony/twilio';
import { logActivity } from '../lib/activity-log';

const InitiateBody = z.object({
  lead_id: z.string().uuid(),
  // Operator's verified cell. Optional — if omitted, falls back to the most
  // recently verified caller_id in the DB (single-user default). Multi-user
  // deployments should pass this explicitly per request.
  operator_phone: z.string().min(8).optional(),
});

/**
 * POST /call/initiate
 *
 * Looks up lead phone, resolves operator's verified caller ID, kicks off the
 * Twilio bridge call. Inserts a calls row up front so the recording-ready
 * webhook can find it via twilio_call_sid.
 */
export async function callInitiateRoute(app: FastifyInstance) {
  app.post('/call/initiate', async (req, reply) => {
    if (!isTwilioConfigured()) {
      return reply.code(503).send({ error: 'twilio_not_configured' });
    }

    const parsed = InitiateBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'invalid_body', details: parsed.error.format() });
    }
    const { lead_id, operator_phone: operatorOverride } = parsed.data;

    // Look up lead phone + vertical
    const { data: lead, error: leadErr } = await supabase()
      .from('leads')
      .select('id, vertical_id, name, phone')
      .eq('id', lead_id)
      .single();
    if (leadErr || !lead) return reply.code(404).send({ error: 'lead_not_found' });
    if (!lead.phone) return reply.code(400).send({ error: 'lead_has_no_phone' });

    // Resolve operator's verified caller ID — explicit param wins, else most-recent verified
    let operator_phone = operatorOverride ?? null;
    if (!operator_phone) {
      const { data: latest } = await supabase()
        .from('caller_ids')
        .select('phone_e164')
        .eq('verified', true)
        .order('verified_at', { ascending: false })
        .limit(1);
      operator_phone = latest?.[0]?.phone_e164 ?? null;
    }
    if (!operator_phone) {
      return reply.code(412).send({
        error: 'no_verified_caller_id',
        message: 'No verified caller ID on file. Operator must verify their cell number first.',
      });
    }

    // Sanity: caller_id == operator_phone for this version (we always show operator's own cell).
    // Future: separate "outbound number to display" from "cell to ring."
    const caller_id = operator_phone;

    // Place call
    let result;
    try {
      result = await initiateBridge({
        operator_cell: operator_phone,
        lead_phone: lead.phone,
        caller_id,
      });
    } catch (err) {
      return reply.code(502).send({ error: 'twilio_initiate_failed', message: (err as Error).message });
    }

    // Persist calls row
    const { data: callRow, error: callErr } = await supabase()
      .from('calls')
      .insert({
        lead_id: lead.id,
        vertical_id: lead.vertical_id,
        twilio_call_sid: result.call_sid,
        operator_phone,
        lead_phone: lead.phone,
        caller_id_used: caller_id,
        status: 'initiated',
      })
      .select('id')
      .single();

    if (callErr) {
      app.log.error({ err: callErr }, 'calls insert failed after Twilio create');
    }

    await logActivity({
      vertical_id: lead.vertical_id,
      lead_id: lead.id,
      type: 'agent_step',
      message: `📞 Dialing ${lead.name ?? lead.phone} via Twilio bridge — your cell will ring in a moment`,
      metadata: { call_sid: result.call_sid, call_id: callRow?.id },
    });

    return reply.code(202).send({
      call_id: callRow?.id,
      call_sid: result.call_sid,
      operator_phone,
      lead_phone: lead.phone,
    });
  });
}
