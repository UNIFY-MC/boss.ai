-- Deals Machine — Universal Sales OS
-- Migration 002: Seed verticals
-- Reference: AI Week Italia/05-SYSTEM-ARCHITECTURE.md §5
--          + AI Week Italia/spec.md §7
--
-- These two verticals ship as TS files in packages/verticals/ as
-- source-of-truth; the SQL inserts mirror that for runtime use.
-- User-created verticals (via Feature D vertical-builder agent)
-- live only in DB, not in TS files.

-- FlyFXFreight: cargo charter, authenticity-receipt vertical
insert into verticals (slug, display_name, config)
values (
  'flyfx',
  'FlyFXFreight Cargo Charter',
  jsonb_build_object(
    'icp', jsonb_build_object(
      'titles', jsonb_build_array(
        'Air Freight Manager',
        'Chartering Manager',
        'Project Cargo Manager',
        'Sea & Air Freight Manager',
        'Head of Air Freight',
        'Operations Manager Air Freight'
      ),
      'titles_exclude', jsonb_build_array('Junior', 'Assistant', 'Intern'),
      'company_size_range', jsonb_build_array(20, 500),
      'countries', jsonb_build_array(
        'United Kingdom', 'Netherlands', 'Germany', 'Belgium',
        'Spain', 'Italy', 'Poland', 'France'
      ),
      'industries', jsonb_build_array('Freight Forwarding', 'Logistics', 'Supply Chain'),
      'company_exclusions', jsonb_build_array(
        'dhl.com', 'kuehne-nagel.com', 'dsv.com', 'schenker.com',
        'expeditors.com', 'cevalogistics.com', 'geodis.com',
        'kerrylogistics.com', 'bollore-logistics.com', 'panalpina.com'
      )
    ),
    'signal_source', jsonb_build_object(
      'type', 'composite',
      'sources', jsonb_build_array(
        jsonb_build_object(
          'name', 'NewsAPI geopolitical',
          'api_key_env', 'NEWSAPI_KEY',
          'filters', jsonb_build_object(
            'categories', jsonb_build_array('geopolitics', 'energy', 'shipping')
          )
        ),
        jsonb_build_object(
          'name', 'Brent crude price feed',
          'url', 'https://api.eia.gov/v2/petroleum/pri/spt/data/'
        ),
        jsonb_build_object(
          'name', 'Suez Canal Authority status',
          'url', 'https://www.suezcanal.gov.eg/English/Pages/default.aspx'
        )
      ),
      'relevance_prompt', 'Is this event likely to cause freight forwarders to seek emergency air charter capacity in the next 30 days? Consider supply chain disruption, port closures, alternative-route demand spikes, and capacity squeezes.'
    ),
    'chain_builder_persona', 'You are a senior geopolitical analyst with 15 years covering global air cargo markets and emergency charter aviation. You connect world events — port closures, oil shocks, conflict, sanctions, labor strikes, weather catastrophes — to downstream supply-chain consequences and to the specific freight-forwarder profiles that will need emergency air charter capacity in the next 30 days. You think in cascades: event → first-order disruption → second-order capacity squeeze → third-order broker urgency → which company profile to call today. You always cite the specific event you are reasoning from. You do not speculate without evidence.',
    'target_daily_leads', 20,
    'script_voice', jsonb_build_object(
      'tone', 'cargo charter broker, aviation-fluent, no-bullshit, peer-to-peer with freight forwarders',
      'anchor_phrases', jsonb_build_array(
        'We work exclusively with freight forwarders — we will never approach your end clients directly.',
        'I am calling because of [specific signal] —'
      ),
      'forbidden_phrases', jsonb_build_array('cheap', 'budget', 'low-cost', 'discount'),
      'pricing_policy', 'never_mention'
    ),
    'crm', jsonb_build_object(
      'hubspot_pipeline_id', null,
      'custom_fields', jsonb_build_object()
    ),
    'cron_time', '07:00',
    'timezone', 'Europe/Berlin'
  )
);

-- AI/SaaS Founder Outreach: the "every judge IS this ICP" demo vertical
insert into verticals (slug, display_name, config)
values (
  'ai-saas',
  'AI/SaaS Founder Outreach',
  jsonb_build_object(
    'icp', jsonb_build_object(
      'titles', jsonb_build_array(
        'CEO', 'Founder', 'Co-Founder', 'CTO',
        'Head of Growth', 'VP Sales', 'VP Marketing',
        'Head of Product', 'Chief AI Officer'
      ),
      'titles_exclude', jsonb_build_array('Junior', 'Assistant', 'Intern', 'Student'),
      'company_size_range', jsonb_build_array(5, 200),
      'countries', jsonb_build_array(
        'United States', 'United Kingdom', 'Germany',
        'Italy', 'France', 'Netherlands', 'Spain', 'Ireland'
      ),
      'industries', jsonb_build_array(
        'SaaS', 'AI', 'Developer Tools', 'Information Technology',
        'Software', 'Machine Learning'
      ),
      'company_exclusions', jsonb_build_array(
        'openai.com', 'anthropic.com', 'google.com', 'microsoft.com',
        'meta.com', 'apple.com', 'amazon.com', 'salesforce.com',
        'oracle.com', 'sap.com'
      )
    ),
    'signal_source', jsonb_build_object(
      'type', 'composite',
      'sources', jsonb_build_array(
        jsonb_build_object(
          'name', 'TechCrunch RSS',
          'url', 'https://techcrunch.com/feed/'
        ),
        jsonb_build_object(
          'name', 'Hacker News top 30',
          'url', 'https://hacker-news.firebaseio.com/v0/topstories.json'
        ),
        jsonb_build_object(
          'name', 'Product Hunt RSS',
          'url', 'https://www.producthunt.com/feed'
        ),
        jsonb_build_object(
          'name', 'NewsAPI tech + business',
          'api_key_env', 'NEWSAPI_KEY',
          'filters', jsonb_build_object(
            'categories', jsonb_build_array('technology', 'business'),
            'language', 'en'
          )
        )
      ),
      'relevance_prompt', 'Is this event likely to create urgency for an AI or SaaS startup founder to talk to a sales-operations or go-to-market tooling provider? Consider: competitive funding rounds in their space, talent flight, product launches forcing positioning shifts, layoffs creating market openings, regulatory moves affecting their roadmap.'
    ),
    'chain_builder_persona', 'You are a Silicon Valley operator with 10 years inside the AI and SaaS startup ecosystem, fluent in TechCrunch coverage, Hacker News discourse, and Product Hunt launches. You connect events — competitive funding rounds, layoffs, leadership moves, product launches, regulatory shifts, big-co strategy pivots — to which specific founders, CTOs, and heads of growth are facing urgent pressure to talk about their go-to-market, positioning, or tooling stack. You think in cascades: competitor event → market repositioning pressure → founder calendar opening → outreach window. You always cite the specific event you are reasoning from. You write for technical readers and never patronize.',
    'target_daily_leads', 15,
    'script_voice', jsonb_build_object(
      'tone', 'AI founder peer, technical, no-fluff, respects the recipient is smart and time-poor',
      'anchor_phrases', jsonb_build_array(
        'I saw [specific signal] —',
        'Quick one — not a demo pitch, just a question'
      ),
      'forbidden_phrases', jsonb_build_array(
        'synergy', 'leverage', 'circle back', 'touch base',
        'low-hanging fruit', 'value-add', 'paradigm'
      ),
      'pricing_policy', 'on_request'
    ),
    'crm', jsonb_build_object(
      'hubspot_pipeline_id', null,
      'custom_fields', jsonb_build_object()
    ),
    'cron_time', '07:00',
    'timezone', 'Europe/Berlin'
  )
);
