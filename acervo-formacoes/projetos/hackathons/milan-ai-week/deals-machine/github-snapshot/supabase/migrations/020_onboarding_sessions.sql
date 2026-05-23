-- Migration 020 — Onboarding sessions table + vertical lineage
--
-- New onboarding flow at /onboarding helps users who don't have a clear ICP
-- yet. The agent asks one question at a time, builds a scratchpad, and at
-- commit creates 1..N verticals (with variations — same buyer/pain, different
-- niches).
--
-- onboarding_sessions: persistent state per cookie token. Users can bail mid-
-- flow and resume up to 14 days later. Status transitions:
--   active → paused (timeout / explicit bail) → abandoned (14d)
--   active → committed (saved as verticals)
--
-- verticals.parent_vertical_id: lineage for variation-duplicates so the UI
-- can group "same buyer / different niche" verticals together.

create table if not exists onboarding_sessions (
  id uuid primary key default gen_random_uuid(),
  cookie_token text not null unique,
  status text not null default 'active'
    check (status in ('active', 'paused', 'committed', 'abandoned')),
  current_step int not null default 1,
  -- Scratchpad: the agent's running ICP hypothesis. Shape:
  -- { product, buyer_titles[], industries[], company_size, geo, pain_point,
  --   trigger_events[], value_prop, niches_detected[], notes }
  scratchpad jsonb not null default '{}'::jsonb,
  -- Q/A history. Shape: [{ step, question, answer, asked_at }]
  answers jsonb not null default '[]'::jsonb,
  -- Validation results from the web-search step.
  validated_companies jsonb,
  -- IDs of verticals created on commit (1..4).
  committed_vertical_ids uuid[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists onboarding_sessions_token_idx on onboarding_sessions (cookie_token);
create index if not exists onboarding_sessions_status_idx on onboarding_sessions (status);

-- Permissive RLS to match the rest of the schema (allow_all).
alter table onboarding_sessions enable row level security;
drop policy if exists onboarding_sessions_allow_all on onboarding_sessions;
create policy onboarding_sessions_allow_all on onboarding_sessions for all using (true) with check (true);

-- Lineage: variations of a single onboarding output share a parent so the
-- /verticals page can group them. Null for verticals built via the original
-- "build a vertical" wizard.
alter table verticals
  add column if not exists parent_vertical_id uuid references verticals(id) on delete set null;

create index if not exists verticals_parent_id_idx on verticals (parent_vertical_id);
