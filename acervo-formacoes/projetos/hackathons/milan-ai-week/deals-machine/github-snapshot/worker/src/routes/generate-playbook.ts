import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { generatePlaybookForVertical } from '../playbook/generate';

const GenerateBody = z.object({
  vertical_id: z.string().uuid(),
});

export async function generatePlaybookRoute(app: FastifyInstance) {
  app.post('/generate-playbook', async (req, reply) => {
    const parse = GenerateBody.safeParse(req.body);
    if (!parse.success) {
      return reply.code(400).send({ error: 'Invalid input', issues: parse.error.issues });
    }
    try {
      const playbook = await generatePlaybookForVertical(parse.data.vertical_id);
      return reply.send({ ok: true, playbook });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      req.log.error({ err: message }, 'generate-playbook failed');
      return reply.code(500).send({ ok: false, error: message });
    }
  });
}
