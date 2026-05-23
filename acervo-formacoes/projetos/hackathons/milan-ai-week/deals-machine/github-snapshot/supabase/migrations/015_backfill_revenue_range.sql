-- 015_backfill_revenue_range.sql
-- Sets icp.revenue_range on every existing vertical so the verticals
-- listing + detail pages have an ARR target row instead of "—".
--
-- New verticals built by the wizard going forward persist revenue_range
-- automatically (see worker/src/vertical-builder/generate.ts).
--
-- Idempotent: jsonb_set with create_missing=true on each row.

-- Aviation Vertical — FlyFX targets mid-market freight forwarders + shippers
update verticals
set config = jsonb_set(config, '{icp,revenue_range}', '["$10M-$100M"]'::jsonb, true)
where slug = 'flyfx';

-- AI/SaaS Founder Outreach — Seed–Series B startups
update verticals
set config = jsonb_set(config, '{icp,revenue_range}', '["$1M-$10M","$10M-$50M"]'::jsonb, true)
where slug = 'ai-saas';

-- B2B Staffing & Recruiting — small to mid-market agencies
update verticals
set config = jsonb_set(config, '{icp,revenue_range}', '["$5M-$50M"]'::jsonb, true)
where slug = 'staffing-recruiting';

-- Enterprise Cybersecurity (CISO outreach) — mid-large enterprises
update verticals
set config = jsonb_set(config, '{icp,revenue_range}', '["$100M-$1B","$1B+"]'::jsonb, true)
where slug = 'cybersec-cisos';

-- VP Eng Cloud Cost (Series B/C) — Cowork's wizard test vertical
update verticals
set config = jsonb_set(config, '{icp,revenue_range}', '["$10M-$50M"]'::jsonb, true)
where slug = 'vp-eng-cloud-cost-series-bc';
