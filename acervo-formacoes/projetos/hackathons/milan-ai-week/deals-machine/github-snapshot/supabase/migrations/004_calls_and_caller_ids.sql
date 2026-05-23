-- Deals Machine — Universal Sales OS
-- Migration 004: Twilio click-to-call infrastructure
-- Reference: AI Week Italia/spec.md §11a
--
-- Two tables:
--   calls       — one row per dialed call, linked to lead + run + (eventual) transcript
--   caller_ids  — verified outgoing caller IDs (one row per operator cell)

-- =============================================================================
-- CALLS: every call placed through the Twilio bridge
-- =============================================================================
create table if not exists calls (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references leads(id) on delete set null,
  vertical_id uuid references verticals(id) on delete cascade,
  twilio_call_sid text unique not null,
  twilio_recording_sid text,
  operator_phone text,
  lead_phone text not null,
  caller_id_used text,
  status text not null default 'initiated'
    check (status in (
      'initiated',
      'ringing',
      'in_progress',
      'completed',
      'failed',
      'no_answer',
      'busy',
      'canceled'
    )),
  recording_url text,
  recording_duration_seconds int,
  transcribed boolean default false,
  transcript_id uuid references transcripts(id) on delete set null,
  error_message text,
  created_at timestamptz default now(),
  ended_at timestamptz
);

create index if not exists idx_calls_lead on calls(lead_id);
create index if not exists idx_calls_vertical on calls(vertical_id);
create index if not exists idx_calls_status on calls(status);
create index if not exists idx_calls_created on calls(created_at desc);

alter table calls enable row level security;
create policy "allow_all_calls" on calls for all using (true) with check (true);

create trigger trg_calls_updated_at
  before update on calls
  for each row execute function set_updated_at();

-- =============================================================================
-- CALLER_IDS: verified outgoing caller IDs (per operator cell)
-- Hackathon-scale single tenant: one shared Twilio account, many verified cells.
-- =============================================================================
create table if not exists caller_ids (
  id uuid primary key default gen_random_uuid(),
  phone_e164 text unique not null,
  display_name text,
  verified boolean default false,
  verification_sid text,
  verified_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_caller_ids_verified on caller_ids(verified);

alter table caller_ids enable row level security;
create policy "allow_all_caller_ids" on caller_ids for all using (true) with check (true);

create trigger trg_caller_ids_updated_at
  before update on caller_ids
  for each row execute function set_updated_at();

-- =============================================================================
-- TRANSCRIPTS: extend source enum + add twilio_call_sid for join-back
-- =============================================================================
alter table transcripts
  drop constraint if exists transcripts_source_check;

alter table transcripts
  add constraint transcripts_source_check
  check (source in ('granola_auto', 'audio_upload', 'text_paste', 'fireflies_auto', 'twilio_call'));

alter table transcripts
  add column if not exists twilio_call_sid text;

create index if not exists idx_transcripts_twilio_call on transcripts(twilio_call_sid)
  where twilio_call_sid is not null;

-- =============================================================================
-- Realtime: publish calls so cockpit can show live status during the call
-- =============================================================================
alter publication supabase_realtime add table calls;
