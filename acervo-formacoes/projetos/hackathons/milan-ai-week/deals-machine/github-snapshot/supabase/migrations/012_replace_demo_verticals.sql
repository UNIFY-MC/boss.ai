-- 012_replace_demo_verticals.sql
-- Revise the demo seeds from 011. Customer Success / Renewals is
-- expansion-motion (not cold-call), and CRE brokerage is referral-driven
-- — neither fits Deals Machine's B2B cold-calling positioning. Replace
-- with two industries where cold-call + signal-driven lead research are
-- the daily core: B2B Staffing & Recruiting, and Enterprise Cybersecurity.
--
-- Idempotent: deletes by slug, then inserts. Safe whether or not 011
-- has been applied yet.

delete from verticals where slug = 'saas-cs-renewals';
delete from verticals where slug = 'cre-brokers';

-- ─────────────────────────────────────────────────────────────────
-- Vertical 1 — B2B Staffing & Recruiting Agencies (cold-call core)
-- ─────────────────────────────────────────────────────────────────
insert into verticals (slug, display_name, config)
values (
  'staffing-recruiting',
  'B2B Staffing & Recruiting',
  jsonb_build_object(
    'icp', jsonb_build_object(
      'titles', jsonb_build_array(
        'VP Talent Acquisition',
        'Head of Talent',
        'Director of Recruiting',
        'Chief People Officer',
        'VP People',
        'Head of People Operations',
        'Director of Talent Acquisition'
      ),
      'titles_exclude', jsonb_build_array('Recruiter', 'Sourcer', 'Coordinator', 'Intern'),
      'company_size_range', jsonb_build_array(100, 2000),
      'countries', jsonb_build_array(
        'United States', 'United Kingdom', 'Canada',
        'Ireland', 'Germany', 'Netherlands'
      ),
      'industries', jsonb_build_array(
        'SaaS', 'Software', 'Financial Services',
        'Biotech', 'Consumer Internet', 'Fintech', 'Cybersecurity'
      ),
      'company_exclusions', jsonb_build_array(
        'roberthalf.com', 'kornferry.com', 'randstad.com',
        'aerotek.com', 'allegisgroup.com', 'kforce.com',
        'manpowergroup.com', 'adecco.com'
      )
    ),
    'signal_source', jsonb_build_object(
      'type', 'composite',
      'sources', jsonb_build_array(
        jsonb_build_object(
          'name', 'TechCrunch RSS (funding rounds)',
          'url', 'https://techcrunch.com/feed/'
        ),
        jsonb_build_object(
          'name', 'Hacker News top stories',
          'url', 'https://hacker-news.firebaseio.com/v0/topstories.json'
        ),
        jsonb_build_object(
          'name', 'HR Dive RSS',
          'url', 'https://www.hrdive.com/feeds/news/'
        ),
        jsonb_build_object(
          'name', 'Built In national RSS',
          'url', 'https://builtin.com/feed'
        ),
        jsonb_build_object(
          'name', 'Layoffs.fyi (passive-candidate signal)',
          'url', 'https://layoffs.fyi/'
        )
      ),
      'relevance_prompt', 'Is this event likely to create urgency for a VP of Talent Acquisition or Head of People at a 100-2000 person company to talk to a recruiting partner in the next 30 days? Consider: Series B/C/D funding rounds (hiring sprees), IPO filings (compliance + scale hiring), competitor layoffs (passive candidate pool unlocked), executive hires (90-day team-build mandate), new product launches (engineering ramps), expansion into new geos (local hiring need), and rapid headcount growth signals.'
    ),
    'chain_builder_persona', 'You are a 15-year B2B recruiting operator who has run agency desks placing engineering, GTM, and exec searches across SaaS, fintech, and biotech. You connect events — funding rounds, IPO filings, competitor layoffs, new exec hires, product launches, geo expansions — to which specific VPs of Talent and Heads of People are facing a 90-day hiring crunch with internal recruiters who can not keep up. You think in cascades: event → hiring mandate → internal-team capacity gap → external-agency urgency → outreach window. You always cite the specific signal. You write peer-to-peer with TA leaders, fluent in their lexicon, and never sound like a vendor cold-pitching.',
    'target_daily_leads', 15,
    'script_voice', jsonb_build_object(
      'tone', 'peer recruiter who has been on the in-house side too, candid about market reality, no fluff',
      'anchor_phrases', jsonb_build_array(
        'Saw the [funding round / hiring spree / layoff] at [company] — figured your queue just got 20% longer.',
        'Not pitching a contingent contract — just a 10-minute compare-notes on the [role family] market.'
      ),
      'forbidden_phrases', jsonb_build_array(
        'rockstar', 'ninja', 'world-class', 'top-tier',
        'synergy', 'leverage', 'partner up', 'circle back'
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
-- Vertical 2 — Enterprise Cybersecurity (selling to CISOs)
-- ─────────────────────────────────────────────────────────────────
insert into verticals (slug, display_name, config)
values (
  'cybersec-cisos',
  'Enterprise Cybersecurity (CISO outreach)',
  jsonb_build_object(
    'icp', jsonb_build_object(
      'titles', jsonb_build_array(
        'Chief Information Security Officer',
        'CISO',
        'Head of Security',
        'VP Information Security',
        'Director of Security Engineering',
        'Director of Security Operations',
        'Head of Cyber Risk'
      ),
      'titles_exclude', jsonb_build_array('Analyst', 'Engineer I', 'Engineer II', 'Intern'),
      'company_size_range', jsonb_build_array(500, 10000),
      'countries', jsonb_build_array(
        'United States', 'United Kingdom', 'Germany',
        'Netherlands', 'Canada', 'Australia', 'Ireland'
      ),
      'industries', jsonb_build_array(
        'Financial Services', 'Healthcare', 'Manufacturing',
        'SaaS', 'Insurance', 'Retail', 'Government', 'Higher Education'
      ),
      'company_exclusions', jsonb_build_array(
        'crowdstrike.com', 'paloaltonetworks.com', 'fortinet.com',
        'okta.com', 'cloudflare.com', 'sentinelone.com', 'wiz.io',
        'zscaler.com', 'cisco.com', 'splunk.com'
      )
    ),
    'signal_source', jsonb_build_object(
      'type', 'composite',
      'sources', jsonb_build_array(
        jsonb_build_object(
          'name', 'KrebsOnSecurity RSS',
          'url', 'https://krebsonsecurity.com/feed/'
        ),
        jsonb_build_object(
          'name', 'The Hacker News RSS',
          'url', 'https://feeds.feedburner.com/TheHackersNews'
        ),
        jsonb_build_object(
          'name', 'BleepingComputer RSS',
          'url', 'https://www.bleepingcomputer.com/feed/'
        ),
        jsonb_build_object(
          'name', 'Dark Reading RSS',
          'url', 'https://www.darkreading.com/rss.xml'
        ),
        jsonb_build_object(
          'name', 'CISA advisories RSS',
          'url', 'https://www.cisa.gov/cybersecurity-advisories/feed'
        ),
        jsonb_build_object(
          'name', 'Hacker News top stories',
          'url', 'https://hacker-news.firebaseio.com/v0/topstories.json'
        )
      ),
      'relevance_prompt', 'Is this event likely to create urgency for a CISO or Head of Security at a 500-10000 person enterprise to take a 15-minute call with a vendor in the next 30 days? Consider: breaches at peer companies in the same industry, newly disclosed CVEs in tools they likely run, ransomware campaigns hitting their vertical, regulatory deadlines (NIS2, DORA, SEC cyber disclosure, PCI 4.0), board-level cyber incidents at competitors, new CISO hires (90-day stack-review window), supply-chain compromises.'
    ),
    'chain_builder_persona', 'You are a 20-year information-security operator who has run security programs as a CISO at two F500s and sold into the CISO seat at a unicorn vendor. You connect events — breaches, zero-days, CVE disclosures, regulatory deadlines, ransomware campaigns, new CISO hires — to which specific Heads of Security and CISOs are facing an unplanned board conversation this quarter. You think in cascades: incident → board scrutiny → tooling gap → CISO urgency → outreach window. You always cite the specific event you are reasoning from. You write CISO-to-CISO, never patronize a security leader, never inflate threat language, and never name-drop frameworks without specific context.',
    'target_daily_leads', 12,
    'script_voice', jsonb_build_object(
      'tone', 'CISO peer, technically credible, calm about real threats, contemptuous of FUD',
      'anchor_phrases', jsonb_build_array(
        'Saw [CVE / breach / regulation] hit [peer org] — if your stack overlaps, worth 15 minutes.',
        'Not a demo pitch — I want to know how you are handling [specific control gap].'
      ),
      'forbidden_phrases', jsonb_build_array(
        'next-gen', 'unparalleled', 'best-in-class', 'industry-leading',
        'rockstar', 'cyber resilient', 'silver bullet', 'AI-powered',
        'synergy', 'leverage', 'circle back'
      ),
      'pricing_policy', 'on_request'
    ),
    'crm', jsonb_build_object(
      'hubspot_pipeline_id', null,
      'custom_fields', jsonb_build_object()
    ),
    'cron_time', '07:30',
    'timezone', 'America/New_York'
  )
);
