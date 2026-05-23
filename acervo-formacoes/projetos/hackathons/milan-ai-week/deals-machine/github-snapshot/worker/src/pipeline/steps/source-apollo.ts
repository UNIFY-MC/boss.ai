import { searchPeople, type ApolloSearchParams } from '../../apollo/client';
import { logActivity } from '../../lib/activity-log';
import type { ApolloPerson, PipelineContext } from '../types';

const PAGES_PER_QUERY = 1;
const PER_PAGE = 50;

function seniorityFromTitles(titles: string[]): string[] {
  const out = new Set<string>();
  for (const t of titles) {
    const l = t.toLowerCase();
    if (l.includes('cto') || l.includes('ceo') || l.includes('cfo') || l.includes('coo') || l.includes('ciso') || l.includes('chief') || l.includes('founder')) out.add('c_suite');
    if (l.includes('vp') || l.includes('vice president')) out.add('vp');
    if (l.includes('director') || l.includes('head of')) out.add('director');
    if (l.includes('manager')) out.add('manager');
  }
  if (out.size === 0) {
    out.add('manager');
    out.add('director');
    out.add('vp');
  }
  return [...out];
}

// Map title keywords to Apollo department slugs. Maximizes recall when a
// person's primary title is in one dept but Apollo tagged them under another.
function departmentsFromTitles(titles: string[]): string[] {
  const out = new Set<string>();
  for (const t of titles) {
    const l = t.toLowerCase();
    if (l.includes('security') || l.includes('ciso') || l.includes('cyber')) {
      out.add('information_security');
      out.add('information_technology');
    }
    if (l.includes('talent') || l.includes('recruit') || l.includes('people') || l.includes('hr')) {
      out.add('human_resources');
    }
    if (l.includes('sales') || l.includes('revenue') || l.includes('growth') || l.includes('go-to-market') || l.includes('gtm')) {
      out.add('master_sales');
    }
    if (l.includes('marketing') || l.includes('demand') || l.includes('brand')) {
      out.add('master_marketing');
    }
    if (l.includes('engineer') || l.includes('cto') || l.includes('product') || l.includes('technology')) {
      out.add('engineering_technical');
    }
    if (l.includes('cfo') || l.includes('finance') || l.includes('controller')) {
      out.add('master_finance');
    }
    if (l.includes('operation') || l.includes('coo') || l.includes('supply') || l.includes('logistic') || l.includes('freight') || l.includes('cargo')) {
      out.add('operations');
    }
  }
  return [...out];
}

function chunk<T>(arr: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

/**
 * Apollo sourcing. One search per chain (using its apollo_search_hint),
 * plus a default search across the vertical's ICP. Dedupe by Apollo ID,
 * filter exclusions, keep one per company.
 */
export async function sourceApollo(ctx: PipelineContext): Promise<void> {
  const icp = ctx.vertical.config.icp;
  const all: ApolloPerson[] = [];

  const titlesExclude = (icp.titles_exclude ?? []) as string[];
  const industries = (icp.industries ?? []) as string[];

  // Per-chain searches — biased to the chain's hint
  for (const c of ctx.chains) {
    const hint = c.apollo_search_hint ?? {};
    const titles = (hint.person_titles && hint.person_titles.length > 0 ? hint.person_titles : icp.titles).slice(0, 10);
    const locations = hint.locations && hint.locations.length > 0 ? hint.locations : icp.countries;
    const params: ApolloSearchParams = {
      person_titles: titles,
      person_not_titles: titlesExclude.length > 0 ? titlesExclude : undefined,
      organization_locations: locations,
      organization_num_employees_ranges: [`${icp.company_size_range[0]},${icp.company_size_range[1]}`],
      person_seniorities: seniorityFromTitles(titles),
      person_departments: departmentsFromTitles(titles),
      q_organization_keyword_tags: industries.length > 0 ? industries : undefined,
      q_keywords: hint.q_keywords,
      contact_email_status: ['verified', 'likely to engage'],
      per_page: PER_PAGE,
      page: 1,
    };
    const results = await searchPeople(params);
    all.push(...results);
  }

  // Baseline ICP search (so we have leads even with weak chains)
  if (all.length < 20) {
    for (const locationBatch of chunk(icp.countries, 5)) {
      for (let p = 1; p <= PAGES_PER_QUERY; p += 1) {
        const results = await searchPeople({
          person_titles: icp.titles.slice(0, 10),
          person_not_titles: titlesExclude.length > 0 ? titlesExclude : undefined,
          organization_locations: locationBatch,
          organization_num_employees_ranges: [`${icp.company_size_range[0]},${icp.company_size_range[1]}`],
          person_seniorities: seniorityFromTitles(icp.titles),
          person_departments: departmentsFromTitles(icp.titles),
          q_organization_keyword_tags: industries.length > 0 ? industries : undefined,
          per_page: PER_PAGE,
          page: p,
          contact_email_status: ['verified', 'likely to engage'],
        });
        all.push(...results);
      }
    }
  }

  // Dedupe by Apollo ID
  const byId = new Map<string, ApolloPerson>();
  for (const p of all) {
    if (p.id && !byId.has(p.id)) byId.set(p.id, p);
  }
  let people = [...byId.values()];

  // Apply company exclusions (substring match on org name OR domain)
  const exclusions = (icp.company_exclusions ?? []).map((s) => s.toLowerCase());
  if (exclusions.length > 0) {
    people = people.filter((p) => {
      const name = (p.organization?.name ?? '').toLowerCase();
      const domain = (p.organization?.primary_domain ?? p.organization?.website_url ?? '').toLowerCase();
      return !exclusions.some((ex) => name.includes(ex) || domain.includes(ex));
    });
  }

  // One-per-company, prefer higher seniority
  const seniorityRank: Record<string, number> = { c_suite: 5, vp: 4, director: 3, manager: 2, senior: 1 };
  const byCompany = new Map<string, ApolloPerson>();
  for (const p of people) {
    const key = (p.organization?.name ?? 'unknown').toLowerCase();
    const cur = byCompany.get(key);
    const curRank = cur ? seniorityRank[cur.seniority ?? ''] ?? 0 : -1;
    const newRank = seniorityRank[p.seniority ?? ''] ?? 0;
    if (!cur || newRank > curRank) byCompany.set(key, p);
  }
  ctx.apollo_results = [...byCompany.values()];

  await logActivity({
    run_id: ctx.run_id,
    vertical_id: ctx.vertical_id,
    type: 'agent_step',
    message: `📇 Apollo: ${ctx.apollo_results.length} unique contacts (from ${all.length} raw)`,
    metadata: {
      sample_companies: ctx.apollo_results.slice(0, 6).map((p) => p.organization?.name).filter(Boolean),
    },
  });
}
