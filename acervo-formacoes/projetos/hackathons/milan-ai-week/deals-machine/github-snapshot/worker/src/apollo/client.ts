// Apollo.io People Search + Enrichment client. Ported from
// Lead-Gen-Tool-main/src/app/api/source-leads/route.ts with vertical-aware params.

import { env } from '../lib/env';
import type { ApolloPerson } from '../pipeline/types';

const BASE = 'https://api.apollo.io/api/v1';

export interface ApolloSearchParams {
  person_titles?: string[];
  person_not_titles?: string[];           // Apollo: server-side title exclusions
  organization_locations?: string[];
  organization_num_employees_ranges?: string[]; // e.g. ['11,50','51,200','201,500']
  person_seniorities?: string[];          // ['manager','director','vp','c_suite']
  person_departments?: string[];          // ['information_security','human_resources',...]
  q_organization_keyword_tags?: string[]; // matches Apollo org tags incl. industries
  q_keywords?: string;
  contact_email_status?: string[];
  per_page?: number;
  page?: number;
}

async function rawPost<T>(path: string, body: object): Promise<T | null> {
  if (!env.APOLLO_API_KEY) return null;
  try {
    const res = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': env.APOLLO_API_KEY,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const txt = await res.text();
      console.error(`[apollo] ${path} ${res.status}: ${txt.slice(0, 200)}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    console.error(`[apollo] ${path} failed:`, err);
    return null;
  }
}

export async function searchPeople(params: ApolloSearchParams): Promise<ApolloPerson[]> {
  const data = await rawPost<{ people?: ApolloPerson[] }>('/mixed_people/api_search', params);
  return data?.people ?? [];
}

export async function enrichPerson(person_id: string): Promise<ApolloPerson | null> {
  // Apollo's person enrichment — phone/email
  const data = await rawPost<{ person?: ApolloPerson }>('/people/match', { id: person_id, reveal_personal_emails: false, reveal_phone_number: true });
  return data?.person ?? null;
}
