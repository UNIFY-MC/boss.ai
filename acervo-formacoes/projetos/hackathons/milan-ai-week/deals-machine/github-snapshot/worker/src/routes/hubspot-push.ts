import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import { createContact } from '../hubspot/client';
import { logActivity } from '../lib/activity-log';

const PushBody = z.object({
  lead_ids: z.array(z.string().uuid()).min(1).max(200),
});

interface PushResult {
  lead_id: string;
  status: 'pushed' | 'skipped_already_pushed' | 'failed';
  hubspot_id?: string;
  reason?: string;
}

/**
 * POST /hubspot/push — push N qualified leads to HubSpot.
 *
 * For each lead:
 *   - Skip if already has hubspot_id (idempotent)
 *   - Build properties payload from lead + most recent lead_rationale
 *   - Create contact in HubSpot
 *   - Update leads.hubspot_id + pushed_at + status='in_hubspot'
 */
export async function hubspotPushRoute(app: FastifyInstance) {
  app.post('/hubspot/push', async (req, reply) => {
    const parsed = PushBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'invalid_body', details: parsed.error.format() });
    }
    const { lead_ids } = parsed.data;

    const { data: leads, error: leadsErr } = await supabase()
      .from('leads')
      .select('id, vertical_id, name, title, company, location, phone, email, domain, hubspot_id, memory_summary')
      .in('id', lead_ids);
    if (leadsErr) return reply.code(500).send({ error: 'lookup_failed', message: leadsErr.message });
    if (!leads || leads.length === 0) return reply.code(404).send({ error: 'no_leads_found' });

    const results: PushResult[] = [];
    let pushedCount = 0;

    for (const lead of leads) {
      if (lead.hubspot_id) {
        results.push({ lead_id: lead.id, status: 'skipped_already_pushed', hubspot_id: lead.hubspot_id });
        continue;
      }

      // Pull most recent rationale to populate the HubSpot Note field
      const { data: rats } = await supabase()
        .from('lead_rationale')
        .select('suggested_angle, full_script, opener_line')
        .eq('lead_id', lead.id)
        .order('created_at', { ascending: false })
        .limit(1);

      const rationale = rats?.[0];
      const notes = [
        rationale?.suggested_angle && `Angle: ${rationale.suggested_angle}`,
        rationale?.opener_line && `Opener: ${rationale.opener_line}`,
        lead.memory_summary && `Brain: ${lead.memory_summary}`,
      ]
        .filter(Boolean)
        .join('\n\n');

      // Split name → firstname/lastname
      const [firstname, ...rest] = (lead.name ?? '').split(/\s+/).filter(Boolean);
      const lastname = rest.join(' ');

      const id = await createContact({
        email: lead.email,
        firstname: firstname ?? null,
        lastname: lastname || null,
        company: lead.company,
        phone: lead.phone,
        website: lead.domain,
        jobtitle: lead.title,
        city: lead.location?.split(',')[0]?.trim() ?? null,
        country: lead.location?.split(',').slice(1).join(',').trim() ?? null,
        hs_lead_status: 'NEW',
        notes,
      });

      if (id) {
        await supabase()
          .from('leads')
          .update({ hubspot_id: id, pushed_at: new Date().toISOString(), status: 'in_hubspot' })
          .eq('id', lead.id);
        results.push({ lead_id: lead.id, status: 'pushed', hubspot_id: id });
        pushedCount += 1;

        await logActivity({
          vertical_id: lead.vertical_id,
          lead_id: lead.id,
          type: 'hubspot_push',
          message: `📤 Pushed ${lead.name ?? '(unknown)'} → HubSpot`,
        });
      } else {
        results.push({ lead_id: lead.id, status: 'failed', reason: 'HubSpot create returned no ID' });
      }
    }

    return reply.send({ pushed: pushedCount, results });
  });
}
