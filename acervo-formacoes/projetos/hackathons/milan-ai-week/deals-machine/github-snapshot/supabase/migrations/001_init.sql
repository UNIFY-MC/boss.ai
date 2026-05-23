-- Deals Machine — Universal Sales OS
-- Migration 001: Initial schema
-- Architecture reference: AI Week Italia/05-SYSTEM-ARCHITECTURE.md §4
--
-- Applies the agent-pipeline schema. The cockpit's legacy tables
-- (from /supabase-schema.sql) are superseded by this and not applied —
-- the new build wires the cockpit to these tables instead.

-- Required extensions (Supabase has pgcrypto enabled by default; this is defensive)
create extension if not exists "pgcrypto";

-- =============================================================================
-- VERTICALS: industry-agnostic core. Each row is one vertical's config.
-- =============================================================================
create table if not exists verticals (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  display_name text not null,
  config jsonb not null,
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_verticals_slug on verticals(slug);
create index if not exists idx_verticals_active on verticals(active) where active = true;

-- =============================================================================
-- RUNS: each daily pipeline invocation (manual or cron-triggered)
-- =============================================================================
create table if not exists runs (
  id uuid primary key default gen_random_uuid(),
  vertical_id uuid references verticals(id) on delete cascade,
  status text not null check (status in ('queued', 'running', 'complete', 'failed', 'partial')),
  started_at timestamptz,
  finished_at timestamptz,
  chains jsonb,
  summary text,
  triggered_by text check (triggered_by in ('manual', 'cron', 'demo')),
  error_message text,
  created_at timestamptz default now()
);

create index if not exists idx_runs_vertical on runs(vertical_id);
create index if not exists idx_runs_status on runs(status);
create index if not exists idx_runs_created on runs(created_at desc);

-- =============================================================================
-- LEADS: sourced contacts (this is the NEW agent-pipeline leads table —
-- distinct from the legacy cockpit leads table in /supabase-schema.sql)
-- =============================================================================
create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  vertical_id uuid references verticals(id) on delete cascade,
  run_id uuid references runs(id) on delete set null,
  name text,
  title text,
  company text,
  location text,
  phone text,
  email text,
  domain text,
  assigned_to text,
  status text not null default 'new'
    check (status in ('new', 'called', 'callback', 'they_callback',
                      'follow_up', 'positive', 'negative',
                      'gatekeeper', 'in_hubspot', 'deleted')),
  pain_level text check (pain_level in ('high', 'medium', 'low')),
  hubspot_id text,
  pushed_at timestamptz,
  memory_summary text,
  apollo_data jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_leads_vertical on leads(vertical_id);
create index if not exists idx_leads_run on leads(run_id);
create index if not exists idx_leads_status on leads(status);
create index if not exists idx_leads_assigned on leads(assigned_to);
create index if not exists idx_leads_domain on leads(domain);
create index if not exists idx_leads_created on leads(created_at desc);

-- =============================================================================
-- LEAD_RATIONALE: the "why this lead?" paragraph + per-lead generated scripts
-- =============================================================================
create table if not exists lead_rationale (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references leads(id) on delete cascade,
  signal_chain jsonb,
  pain_level text check (pain_level in ('high', 'medium', 'low')),
  suggested_angle text,
  opener_line text,
  full_script text,
  cold_email text,
  email_subject text,
  objection_handling jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_rationale_lead on lead_rationale(lead_id);

-- =============================================================================
-- ACTIVITY_LOG: the agent's append-only event stream
-- The streaming-reasoning UI subscribes here filtered by run_id.
-- =============================================================================
create table if not exists activity_log (
  id bigserial primary key,
  run_id uuid references runs(id) on delete cascade,
  vertical_id uuid references verticals(id) on delete cascade,
  lead_id uuid references leads(id) on delete set null,
  type text not null,
  -- types: 'agent_step', 'chain_event', 'security_flag', 'transcript_ingest',
  --        'hubspot_push', 'chat_insight', 'cron_trigger', 'error', 'info'
  message text not null,
  metadata jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_activity_run on activity_log(run_id, created_at);
create index if not exists idx_activity_vertical on activity_log(vertical_id, created_at);
create index if not exists idx_activity_type on activity_log(type);
create index if not exists idx_activity_created on activity_log(created_at desc);

-- =============================================================================
-- BRAIN_ENTRIES: structured insights that influence future runs
-- =============================================================================
create table if not exists brain_entries (
  id uuid primary key default gen_random_uuid(),
  vertical_id uuid references verticals(id) on delete cascade,
  type text not null
    check (type in ('angle_landed', 'angle_failed', 'objection_recurring',
                    'commitment_made', 'deal_killer', 'profile_chase',
                    'profile_avoid', 'manual_insight')),
  content text not null,
  evidence_quote text,
  weight numeric default 1.0 check (weight >= 0 and weight <= 10),
  source text check (source in ('transcript', 'chat', 'manual')),
  source_ref uuid,
  lead_id uuid references leads(id) on delete set null,
  decayed_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists idx_brain_vertical on brain_entries(vertical_id);
create index if not exists idx_brain_type on brain_entries(type);
create index if not exists idx_brain_active on brain_entries(vertical_id, type) where decayed_at is null;
create index if not exists idx_brain_created on brain_entries(created_at desc);

-- =============================================================================
-- TRANSCRIPTS: raw call recordings/text — sources for Brain ingestion
-- Sources: granola_auto (primary), audio_upload, text_paste
-- =============================================================================
create table if not exists transcripts (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references leads(id) on delete set null,
  vertical_id uuid references verticals(id) on delete cascade,
  raw_text text not null,
  audio_url text,
  audio_provider text check (audio_provider in ('speechmatics', 'whisper')),
  source text not null default 'text_paste'
    check (source in ('granola_auto', 'audio_upload', 'text_paste', 'fireflies_auto')),
  granola_meeting_id text unique,
  fireflies_meeting_id text unique,
  match_confidence text check (match_confidence in ('high', 'medium', 'low', 'unmatched')),
  processed boolean default false,
  flagged boolean default false,
  created_at timestamptz default now()
);

create index if not exists idx_transcripts_lead on transcripts(lead_id);
create index if not exists idx_transcripts_processed on transcripts(processed);
create index if not exists idx_transcripts_source on transcripts(source);
create index if not exists idx_transcripts_needs_assignment on transcripts(vertical_id, processed) where lead_id is null and processed = false;

-- =============================================================================
-- SECURITY_FLAGS: Lobster Trap (or fallback) detections
-- =============================================================================
create table if not exists security_flags (
  id uuid primary key default gen_random_uuid(),
  source_type text not null check (source_type in ('transcript', 'reply', 'chat')),
  source_ref uuid,
  vertical_id uuid references verticals(id) on delete cascade,
  lead_id uuid references leads(id) on delete set null,
  flagged_content_excerpt text,
  reason text,
  detector text check (detector in ('lobster_trap', 'regex_fallback', 'claude_classifier')),
  created_at timestamptz default now()
);

create index if not exists idx_security_vertical on security_flags(vertical_id);
create index if not exists idx_security_created on security_flags(created_at desc);

-- =============================================================================
-- RLS: enable, then permit all (single-tenant hackathon; real auth post-event)
-- =============================================================================
alter table verticals       enable row level security;
alter table runs            enable row level security;
alter table leads           enable row level security;
alter table lead_rationale  enable row level security;
alter table activity_log    enable row level security;
alter table brain_entries   enable row level security;
alter table transcripts     enable row level security;
alter table security_flags  enable row level security;

create policy "allow_all_verticals"      on verticals       for all using (true) with check (true);
create policy "allow_all_runs"           on runs            for all using (true) with check (true);
create policy "allow_all_leads"          on leads           for all using (true) with check (true);
create policy "allow_all_rationale"      on lead_rationale  for all using (true) with check (true);
create policy "allow_all_activity"       on activity_log    for all using (true) with check (true);
create policy "allow_all_brain"          on brain_entries   for all using (true) with check (true);
create policy "allow_all_transcripts"    on transcripts     for all using (true) with check (true);
create policy "allow_all_security"       on security_flags  for all using (true) with check (true);

-- =============================================================================
-- AUTO-UPDATE updated_at triggers
-- =============================================================================
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_verticals_updated_at
  before update on verticals
  for each row execute function set_updated_at();

create trigger trg_leads_updated_at
  before update on leads
  for each row execute function set_updated_at();
