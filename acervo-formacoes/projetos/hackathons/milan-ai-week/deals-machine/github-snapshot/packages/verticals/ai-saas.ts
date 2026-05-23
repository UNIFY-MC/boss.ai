import type { SeededVertical } from './schema';

export const aiSaas: SeededVertical = {
  slug: 'ai-saas',
  display_name: 'AI/SaaS Founder Outreach',
  config: {
    icp: {
      titles: [
        'CEO',
        'Founder',
        'Co-Founder',
        'CTO',
        'Head of Growth',
        'VP Sales',
        'VP Marketing',
        'Head of Product',
        'Chief AI Officer',
      ],
      titles_exclude: ['Junior', 'Assistant', 'Intern', 'Student'],
      company_size_range: [5, 200],
      countries: [
        'United States',
        'United Kingdom',
        'Germany',
        'Italy',
        'France',
        'Netherlands',
        'Spain',
        'Ireland',
      ],
      industries: [
        'SaaS',
        'AI',
        'Developer Tools',
        'Information Technology',
        'Software',
        'Machine Learning',
      ],
      company_exclusions: [
        'openai.com',
        'anthropic.com',
        'google.com',
        'microsoft.com',
        'meta.com',
        'apple.com',
        'amazon.com',
        'salesforce.com',
        'oracle.com',
        'sap.com',
      ],
    },
    signal_source: {
      type: 'composite',
      sources: [
        {
          name: 'TechCrunch RSS',
          url: 'https://techcrunch.com/feed/',
        },
        {
          name: 'Hacker News top 30',
          url: 'https://hacker-news.firebaseio.com/v0/topstories.json',
        },
        {
          name: 'Product Hunt RSS',
          url: 'https://www.producthunt.com/feed',
        },
      ],
      relevance_prompt:
        'Is this event likely to create urgency for an AI or SaaS startup founder to talk to a sales-operations or go-to-market tooling provider? Consider: competitive funding rounds in their space, talent flight, product launches forcing positioning shifts, layoffs creating market openings, regulatory moves affecting their roadmap.',
    },
    chain_builder_persona:
      'You are a Silicon Valley operator with 10 years inside the AI and SaaS startup ecosystem, fluent in TechCrunch coverage, Hacker News discourse, and Product Hunt launches. You connect events — competitive funding rounds, layoffs, leadership moves, product launches, regulatory shifts, big-co strategy pivots — to which specific founders, CTOs, and heads of growth are facing urgent pressure to talk about their go-to-market, positioning, or tooling stack. You think in cascades: competitor event → market repositioning pressure → founder calendar opening → outreach window. You always cite the specific event you are reasoning from. You write for technical readers and never patronize.',
    target_daily_leads: 15,
    script_voice: {
      tone: 'AI founder peer, technical, no-fluff, respects the recipient is smart and time-poor',
      anchor_phrases: [
        'I saw [specific signal] —',
        'Quick one — not a demo pitch, just a question',
      ],
      forbidden_phrases: [
        'synergy',
        'leverage',
        'circle back',
        'touch base',
        'low-hanging fruit',
        'value-add',
        'paradigm',
      ],
      pricing_policy: 'on_request',
    },
    crm: {
      hubspot_pipeline_id: null,
      custom_fields: {},
    },
    cron_time: '07:00',
    timezone: 'Europe/Berlin',
  },
};
