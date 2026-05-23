import { searchByDomainOrEmail } from '../../hubspot/client';
import { logActivity } from '../../lib/activity-log';
import type { PipelineContext } from '../types';

/**
 * Drop any Apollo result whose company/email already exists in HubSpot.
 * Sequential calls to keep us comfortable inside HubSpot rate limits.
 * If HUBSPOT_API_KEY is unset we pass through with no dedupe.
 */
export async function dedupeHubSpot(ctx: PipelineContext): Promise<void> {
  if (ctx.apollo_results.length === 0) {
    ctx.deduped_against_hubspot = [];
    return;
  }

  const survivors = [];
  let removed = 0;

  for (const p of ctx.apollo_results) {
    const domain =
      (p.organization?.primary_domain ??
        (p.organization?.website_url ?? '')
          .replace(/^https?:\/\//, '')
          .split('/')[0]) || null;
    const email = p.email ?? null;

    const hit = await searchByDomainOrEmail(domain, email);
    if (hit.results && hit.results.length > 0) {
      removed += 1;
      continue;
    }
    survivors.push(p);
  }

  ctx.deduped_against_hubspot = survivors;

  await logActivity({
    run_id: ctx.run_id,
    vertical_id: ctx.vertical_id,
    type: 'agent_step',
    message: `🧹 HubSpot dedupe: ${survivors.length} kept, ${removed} already in HubSpot`,
  });
}
