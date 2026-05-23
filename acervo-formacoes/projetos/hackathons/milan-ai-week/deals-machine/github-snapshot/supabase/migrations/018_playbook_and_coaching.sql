-- Migration 018 — Script Playbook (B5) + Live Coaching events
-- Adds playbook attribution to brain entries, snapshot+coaching to calls,
-- and a new live_coaching_events table fed by the live coaching loop.

-- ─────────────────────── brain entries: playbook attribution ────
-- Which playbook section did this entry feed into? (e.g. "opener.cold_no_context",
-- "angle.2", "objection.pricing"). Set by the playbook generator.
alter table brain_entries
  add column if not exists playbook_credit text;

-- Outcome signal that last bumped this entry's weight.
alter table brain_entries
  add column if not exists last_outcome_signal text;
alter table brain_entries
  add column if not exists last_outcome_signal_at timestamptz;

create index if not exists brain_entries_playbook_credit_idx
  on brain_entries(playbook_credit) where playbook_credit is not null;

-- ─────────────────────── calls: playbook snapshot + coaching count ──
-- Snapshot of the playbook used at call time, so we can attribute outcomes
-- back to specific sections even if the playbook later changes.
alter table calls
  add column if not exists playbook_snapshot jsonb;
alter table calls
  add column if not exists coaching_events_count integer default 0;
alter table calls
  add column if not exists enrichment jsonb;
alter table calls
  add column if not exists outcome_signal text;

-- ─────────────────────── live_coaching_events ────────────────────
create table if not exists live_coaching_events (
  id uuid primary key default gen_random_uuid(),
  call_id uuid references calls(id) on delete cascade,
  lead_id uuid references leads(id) on delete set null,
  vertical_id uuid references verticals(id) on delete set null,
  type text not null,
  message text not null,
  suggested_action text,
  playbook_ref text,
  source_transcript_window text,
  created_at timestamptz default now()
);

alter table live_coaching_events drop constraint if exists live_coaching_events_type_check;
alter table live_coaching_events add constraint live_coaching_events_type_check
  check (type in (
    'objection_detected',
    'suggestion',
    'confirmation_gap',
    'section_change',
    'ack',
    'closing_cue',
    'commitment_heard'
  ));

create index if not exists live_coaching_events_call_idx
  on live_coaching_events(call_id, created_at);
create index if not exists live_coaching_events_lead_idx
  on live_coaching_events(lead_id, created_at desc);

alter table live_coaching_events enable row level security;

drop policy if exists allow_all_live_coaching_events on live_coaching_events;
create policy allow_all_live_coaching_events on live_coaching_events
  for all using (true) with check (true);

-- ─────────────────────── verify ─────────────────────────────────
-- select count(*) as live_coaching_events_table_ready from live_coaching_events;
-- select column_name from information_schema.columns
-- where table_name = 'brain_entries' and column_name in ('playbook_credit', 'last_outcome_signal');
