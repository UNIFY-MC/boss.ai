import { env } from '../lib/env';

const BASE = 'https://api.hubapi.com';

interface HSContactSearchResp {
  results?: Array<{
    id: string;
    properties?: { email?: string; firstname?: string; lastname?: string; company?: string; phone?: string; website?: string };
  }>;
}

async function authHeaders() {
  return {
    Authorization: `Bearer ${env.HUBSPOT_API_KEY}`,
    'Content-Type': 'application/json',
  };
}

export async function searchByDomainOrEmail(domain?: string | null, email?: string | null): Promise<HSContactSearchResp> {
  if (!env.HUBSPOT_API_KEY) return {};
  if (!domain && !email) return {};

  const filterGroups: { filters: Array<{ propertyName: string; operator: string; value: string }> }[] = [];
  if (email) filterGroups.push({ filters: [{ propertyName: 'email', operator: 'EQ', value: email }] });
  if (domain) filterGroups.push({ filters: [{ propertyName: 'website', operator: 'CONTAINS_TOKEN', value: domain }] });

  try {
    const res = await fetch(`${BASE}/crm/v3/objects/contacts/search`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify({
        filterGroups,
        properties: ['email', 'firstname', 'lastname', 'company', 'phone', 'website'],
        limit: 5,
      }),
    });
    if (!res.ok) return {};
    return (await res.json()) as HSContactSearchResp;
  } catch (err) {
    console.error('[hubspot] search failed:', err);
    return {};
  }
}

export interface HSCreateContactInput {
  email?: string | null;
  firstname?: string | null;
  lastname?: string | null;
  company?: string | null;
  phone?: string | null;
  website?: string | null;
  jobtitle?: string | null;
  city?: string | null;
  country?: string | null;
  hs_lead_status?: string;
  notes?: string | null;
}

export async function createContact(input: HSCreateContactInput): Promise<string | null> {
  if (!env.HUBSPOT_API_KEY) return null;
  const properties: Record<string, string> = {};
  for (const [k, v] of Object.entries(input)) {
    if (v != null && v !== '') properties[k] = String(v);
  }
  try {
    const res = await fetch(`${BASE}/crm/v3/objects/contacts`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify({ properties }),
    });
    if (!res.ok) {
      console.error(`[hubspot] create contact ${res.status}: ${await res.text()}`);
      return null;
    }
    const data = (await res.json()) as { id?: string };
    return data.id ?? null;
  } catch (err) {
    console.error('[hubspot] create contact failed:', err);
    return null;
  }
}
