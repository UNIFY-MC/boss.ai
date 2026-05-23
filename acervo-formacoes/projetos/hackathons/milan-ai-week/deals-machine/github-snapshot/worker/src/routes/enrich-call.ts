import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { enrichCall } from '../playbook/enrich-call';

const Body = z.object({
  call_id: z.string().uuid(),
});

export async function enrichCallRoute(app: FastifyInstance) {
  app.post('/enrich-call', async (req, reply) => {
    const parsed = Body.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'invalid_body', issues: parsed.error.issues });
    }
    try {
      const enrichment = await enrichCall(parsed.data.call_id);
      return reply.send({ ok: true, enrichment });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      req.log.error({ err: message }, 'enrich-call failed');
      return reply.code(500).send({ ok: false, error: message });
    }
  });
}
