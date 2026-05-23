import type { SeededVertical } from './schema';

export const flyfx: SeededVertical = {
  slug: 'flyfx',
  display_name: 'Aviation Vertical',
  config: {
    icp: {
      titles: [
        'Air Freight Manager',
        'Chartering Manager',
        'Project Cargo Manager',
        'Sea & Air Freight Manager',
        'Head of Air Freight',
        'Operations Manager Air Freight',
      ],
      titles_exclude: ['Junior', 'Assistant', 'Intern'],
      company_size_range: [20, 500],
      countries: [
        'United Kingdom',
        'Netherlands',
        'Germany',
        'Belgium',
        'Spain',
        'Italy',
        'Poland',
        'France',
      ],
      industries: ['Freight Forwarding', 'Logistics', 'Supply Chain'],
      company_exclusions: [
        'dhl.com',
        'kuehne-nagel.com',
        'dsv.com',
        'schenker.com',
        'expeditors.com',
        'cevalogistics.com',
        'geodis.com',
        'kerrylogistics.com',
        'bollore-logistics.com',
        'panalpina.com',
      ],
    },
    signal_source: {
      type: 'composite',
      sources: [
        {
          name: 'Hacker News Show HN',
          url: 'https://hnrss.org/show',
        },
        {
          name: 'Brent crude price feed',
          url: 'https://api.eia.gov/v2/petroleum/pri/spt/data/',
        },
        {
          name: 'Suez Canal Authority status',
          url: 'https://www.suezcanal.gov.eg/English/Pages/default.aspx',
        },
      ],
      relevance_prompt:
        'Is this event likely to cause freight forwarders to seek emergency air charter capacity in the next 30 days? Consider supply chain disruption, port closures, alternative-route demand spikes, and capacity squeezes.',
    },
    chain_builder_persona:
      'You are a senior geopolitical analyst with 15 years covering global air cargo markets and emergency charter aviation. You connect world events — port closures, oil shocks, conflict, sanctions, labor strikes, weather catastrophes — to downstream supply-chain consequences and to the specific freight-forwarder profiles that will need emergency air charter capacity in the next 30 days. You think in cascades: event → first-order disruption → second-order capacity squeeze → third-order broker urgency → which company profile to call today. You always cite the specific event you are reasoning from. You do not speculate without evidence.',
    target_daily_leads: 20,
    script_voice: {
      tone: 'cargo charter broker, aviation-fluent, no-bullshit, peer-to-peer with freight forwarders',
      anchor_phrases: [
        'We work exclusively with freight forwarders — we will never approach your end clients directly.',
        'I am calling because of [specific signal] —',
      ],
      forbidden_phrases: ['cheap', 'budget', 'low-cost', 'discount'],
      pricing_policy: 'never_mention',
    },
    crm: {
      hubspot_pipeline_id: null,
      custom_fields: {},
    },
    cron_time: '07:00',
    timezone: 'Europe/Berlin',
  },
};
