-- 013_add_reddit_sources.sql
-- Now that the worker's scrape-signals step recognizes Reddit JSON
-- URLs (worker/src/signals/reddit.ts), wire one subreddit into each
-- of the three demo verticals where it makes sense. The agent will
-- pull /top/.json on every run and merge results with RSS + HN.
--
-- Uses jsonb append so the existing sources array is preserved.

update verticals
set config = jsonb_set(
  config,
  '{signal_source,sources}',
  coalesce(config->'signal_source'->'sources', '[]'::jsonb)
    || jsonb_build_array(jsonb_build_object(
         'name', 'r/recruiting (Reddit)',
         'url', 'https://www.reddit.com/r/recruiting/top/'
       ))
)
where slug = 'staffing-recruiting';

update verticals
set config = jsonb_set(
  config,
  '{signal_source,sources}',
  coalesce(config->'signal_source'->'sources', '[]'::jsonb)
    || jsonb_build_array(jsonb_build_object(
         'name', 'r/cybersecurity (Reddit)',
         'url', 'https://www.reddit.com/r/cybersecurity/top/'
       ))
)
where slug = 'cybersec-cisos';

update verticals
set config = jsonb_set(
  config,
  '{signal_source,sources}',
  coalesce(config->'signal_source'->'sources', '[]'::jsonb)
    || jsonb_build_array(jsonb_build_object(
         'name', 'r/SaaS (Reddit)',
         'url', 'https://www.reddit.com/r/SaaS/top/'
       ))
)
where slug = 'ai-saas';
