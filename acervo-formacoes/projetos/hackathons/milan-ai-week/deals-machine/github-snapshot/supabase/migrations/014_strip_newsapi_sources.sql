-- 014_strip_newsapi_sources.sql
-- Seed migration 002 baked NewsAPI source entries into the FlyFX
-- (Aviation) and AI/SaaS verticals' signal_source.sources arrays.
-- The scraper no longer supports NewsAPI (was removed earlier today)
-- so those entries just emit "↪ Skipped" warnings on every run.
-- This migration filters them out of the live config.
--
-- Uses jsonb_agg + filter so the remaining sources stay in order
-- and no other vertical config is touched.

update verticals
set config = jsonb_set(
  config,
  '{signal_source,sources}',
  coalesce(
    (
      select jsonb_agg(elem)
      from jsonb_array_elements(config->'signal_source'->'sources') elem
      where (elem->>'name') is not null
        and (elem->>'name') !~* 'newsapi'
        and (elem->>'name') !~* 'news api'
    ),
    '[]'::jsonb
  )
)
where slug in ('flyfx', 'ai-saas');
