import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import { startCallerIdVerification, listVerifiedCallerIds, isTwilioConfigured } from '../telephony/twilio';

const VerifyBody = z.object({
  phone: z.string().min(8).regex(/^\+\d{6,15}$/, 'phone must be +E.164 like +15551234567'),
  display_name: z.string().optional(),
});

const StatusQuery = z.object({
  phone: z.string().min(8),
});

/**
 * POST /caller-id/verify  -> starts Twilio's automated verification call.
 *                            Twilio places a call to the cell, speaks a code,
 *                            and the user enters it via DTMF on that call.
 *                            We INSERT a caller_ids row (verified=false) and
 *                            return the validation_code so the cockpit can
 *                            display it to the user (so they know what to enter).
 *
 * GET  /caller-id/verify/status?phone=+E.164  -> checks whether Twilio reports
 *                                                this number as verified.
 *                                                Polled by the cockpit modal.
 *
 * GET  /caller-id/verify/all  -> list all verified numbers on the account
 *                                (useful for debugging / multi-user dashboards).
 */
export async function callerIdVerifyRoutes(app: FastifyInstance) {
  app.post('/caller-id/verify', async (req, reply) => {
    if (!isTwilioConfigured()) {
      return reply.code(503).send({ error: 'twilio_not_configured' });
    }
    const parsed = VerifyBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'invalid_body', details: parsed.error.format() });
    }
    const { phone, display_name } = parsed.data;

    // Short-circuit: if Twilio already lists this number as a verified caller ID
    // (from a previous verification on this account), mark it verified locally
    // and skip the verification call. The cockpit modal will poll /status and
    // flip straight to "verified".
    try {
      const already = await listVerifiedCallerIds();
      if (already.includes(phone)) {
        await supabase()
          .from('caller_ids')
          .upsert(
            {
              phone_e164: phone,
              display_name: display_name ?? null,
              verified: true,
              verified_at: new Date().toISOString(),
            },
            { onConflict: 'phone_e164' }
          );
        return reply.send({
          phone,
          validation_code: null,
          already_verified: true,
          message: 'This number is already verified on the Twilio account — you can place calls now.',
        });
      }
    } catch (err) {
      app.log.warn({ err }, 'listVerifiedCallerIds preflight failed; continuing to fresh verify');
    }

    // Insert (or update) caller_ids row up front
    const { error: upErr } = await supabase()
      .from('caller_ids')
      .upsert(
        { phone_e164: phone, display_name: display_name ?? null, verified: false },
        { onConflict: 'phone_e164' }
      );
    if (upErr) app.log.warn({ err: upErr }, 'caller_ids upsert failed');

    let validation;
    try {
      validation = await startCallerIdVerification(phone, display_name);
    } catch (err) {
      return reply.code(502).send({
        error: 'twilio_verify_failed',
        message: (err as Error).message,
      });
    }

    await supabase()
      .from('caller_ids')
      .update({ verification_sid: validation.sid })
      .eq('phone_e164', phone);

    return reply.send({
      phone,
      validation_code: validation.validation_code,
      message: 'Twilio will call you in ~10 seconds. When prompted, enter the code above on the keypad.',
    });
  });

  app.get('/caller-id/verify/status', async (req, reply) => {
    const parsed = StatusQuery.safeParse(req.query);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'invalid_query', details: parsed.error.format() });
    }

    const verified = await listVerifiedCallerIds();
    const isVerified = verified.includes(parsed.data.phone);

    if (isVerified) {
      await supabase()
        .from('caller_ids')
        .update({ verified: true, verified_at: new Date().toISOString() })
        .eq('phone_e164', parsed.data.phone);
    }

    return reply.send({ phone: parsed.data.phone, verified: isVerified });
  });

  app.get('/caller-id/verify/all', async (_req, reply) => {
    const verified = await listVerifiedCallerIds();
    return reply.send({ verified });
  });
}
