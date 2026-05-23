-- 011_seed_demo_verticals.sql
-- Two additional demo verticals so the Verticals grid shows industry
-- variety to judges (not just Aviation + AI/SaaS). Both use real RSS
-- feeds (no NewsAPI), match the script_voice/chain_builder_persona
-- shape that /verticals/[slug] reads.

-- ─────────────────────────────────────────────────────────────────
-- Vertical 1 — SaaS Customer Success / Renewals / Churn Prevention
-- ─────────────────────────────────────────────────────────────────
insert into verticals (slug, display_name, config)
values (
  'saas-cs-renewals',
  'SaaS Renewals & Churn Prevention',
  jsonb_build_object(
    'icp', jsonb_build_object(
      'titles', jsonb_build_array(
        'VP Customer Success',
        'Head of Customer Success',
        'Director of Customer Success',
        'Director of Renewals',
        'Chief Customer Officer',
        'VP Account Management'
      ),
      'titles_exclude', jsonb_build_array('Junior', 'Associate', 'Coordinator', 'Intern'),
      'company_size_range', jsonb_build_array(200, 2000),
      'countries', jsonb_build_array(
        'United States', 'United Kingdom', 'Canada',
        'Netherlands', 'Germany', 'Australia'
      ),
      'industries', jsonb_build_array(
        'SaaS', 'Software', 'Information Technology',
        'Customer Success Platforms'
      ),
      'company_exclusions', jsonb_build_array(
        'salesforce.com', 'hubspot.com', 'gainsight.com',
        'totango.com', 'churnzero.com', 'planhat.com'
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
          'name', 'Hacker News top stories',
          'url', 'https://hacker-news.firebaseio.com/v0/topstories.json'
        ),
        jsonb_build_object(
          'name', 'SaaStr blog RSS',
          'url', 'https://www.saastr.com/feed/'
        ),
        jsonb_build_object(
          'name', 'Layoffs.fyi (churn-risk signal)',
          'url', 'https://layoffs.fyi/'
        )
      ),
      'relevance_prompt', 'Is this event likely to create urgency for a VP of Customer Success or Head of Renewals at a SaaS company to talk to a churn-prevention or renewals-acceleration partner in the next 30 days? Consider: tech layoffs at their customer base (churn risk), competitor security incidents, public board-level customer-trust events, large customer logos in trouble, new CS-leader hires (90-day mandate window), public AI re-orgs forcing CS to defend ROI.'
    ),
    'chain_builder_persona', 'You are a 12-year SaaS Customer Success operator who has run renewals teams from Series B through IPO. You connect events — tech layoffs, customer-base contraction, competitive security incidents, AI re-orgs, public board pressure — to which specific Heads of CS and VPs of Renewals are facing a quarter-end at-risk number. You think in cascades: event → customer-base impact → renewal-quarter risk → CS leader on the hook → outreach window. You always cite the specific event. You write peer-to-peer to a CS leader, never patronize, and never speculate without evidence.',
    'target_daily_leads', 12,
    'script_voice', jsonb_build_object(
      'tone', 'CS-leader peer, prevention-focused, dollar-aware, calm under pressure',
      'anchor_phrases', jsonb_build_array(
        'Saw [specific signal] — wanted to share what we learned from a similar event last quarter.',
        'Not a demo ask — just a 15-minute compare-notes call.'
      ),
      'forbidden_phrases', jsonb_build_array(
        'synergy', 'best-in-class', 'world-class', 'next-gen',
        'leverage', 'circle back', 'touch base', 'low-hanging fruit'
      ),
      'pricing_policy', 'on_request'
    ),
    'crm', jsonb_build_object(
      'hubspot_pipeline_id', null,
      'custom_fields', jsonb_build_object()
    ),
    'cron_time', '08:00',
    'timezone', 'America/New_York'
  )
);

-- ─────────────────────────────────────────────────────────────────
-- Vertical 2 — Commercial Real Estate Brokers (Off-Market Deals)
-- ─────────────────────────────────────────────────────────────────
insert into verticals (slug, display_name, config)
values (
  'cre-brokers',
  'Commercial Real Estate Brokers',
  jsonb_build_object(
    'icp', jsonb_build_object(
      'titles', jsonb_build_array(
        'Managing Director',
        'Senior Vice President',
        'Principal',
        'Senior Broker',
        'Director of Capital Markets',
        'Investment Sales Director'
      ),
      'titles_exclude', jsonb_build_array('Analyst', 'Junior', 'Associate', 'Researcher'),
      'company_size_range', jsonb_build_array(50, 1500),
      'countries', jsonb_build_array('United States', 'Canada'),
      'industries', jsonb_build_array(
        'Commercial Real Estate', 'Real Estate Brokerage',
        'Real Estate Investment', 'Capital Markets'
      ),
      'company_exclusions', jsonb_build_array(
        'cbre.com', 'jll.com', 'cushwake.com', 'colliers.com',
        'newmark.com', 'savills.us', 'avisonyoung.com'
      )
    ),
    'signal_source', jsonb_build_object(
      'type', 'composite',
      'sources', jsonb_build_array(
        jsonb_build_object(
          'name', 'The Real Deal RSS',
          'url', 'https://therealdeal.com/feed/'
        ),
        jsonb_build_object(
          'name', 'GlobeSt RSS',
          'url', 'https://www.globest.com/feed/'
        ),
        jsonb_build_object(
          'name', 'Bisnow national RSS',
          'url', 'https://www.bisnow.com/national/rss'
        ),
        jsonb_build_object(
          'name', 'Connect CRE RSS',
          'url', 'https://www.connectcre.com/feed/'
        )
      ),
      'relevance_prompt', 'Is this event likely to create urgency for a Commercial Real Estate broker to talk to an off-market deal-sourcing partner in the next 30 days? Consider: distressed asset listings, large tenant relocations, refinancing-pressure stories, rezoning approvals, REIT divestitures, sub-market sales velocity spikes, lender pullback in a specific asset class.'
    ),
    'chain_builder_persona', 'You are a 20-year commercial real estate veteran who has brokered both leasing and capital markets deals across NY, Chicago, LA, and Miami. You connect events — distressed listings, tenant relocations, refi pressure, REIT divestitures, rezonings, lender pullback — to which specific senior brokers and managing directors are scrambling for off-market deal flow this quarter. You think in cascades: market event → owner pressure → deal flow gap → broker urgency → outreach window. You always cite the specific event you are reasoning from. You write CRE-fluent and never patronize a dealmaker.',
    'target_daily_leads', 10,
    'script_voice', jsonb_build_object(
      'tone', 'CRE dealmaker peer, transactional, no-nonsense, respects time',
      'anchor_phrases', jsonb_build_array(
        'Saw the [specific signal] in [sub-market] — would the off-market angle help your pipeline?',
        'Not a vendor pitch — we only place deals broker-to-broker.'
      ),
      'forbidden_phrases', jsonb_build_array(
        'unique opportunity', 'win-win', 'value-add', 'synergy',
        'reach out', 'circle back', 'low-hanging fruit'
      ),
      'pricing_policy', 'never_mention'
    ),
    'crm', jsonb_build_object(
      'hubspot_pipeline_id', null,
      'custom_fields', jsonb_build_object()
    ),
    'cron_time', '07:30',
    'timezone', 'America/New_York'
  )
);
