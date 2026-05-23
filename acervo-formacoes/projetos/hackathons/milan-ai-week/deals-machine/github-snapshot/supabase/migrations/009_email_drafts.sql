-- 009_email_drafts.sql
-- Pre-emptive follow-up email drafts created by the worker after a call
-- transcript is ingested + brain entries are extracted. The operator sees
-- a "Draft ready" badge on the lead row in /leads and either clicks Send
-- (one click) or opens the modal pre-populated to edit first. The agent
-- did the cognitive work — the click is just human-in-the-loop.

create table if not exists email_drafts (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  vertical_id uuid references verticals(id) on delete set null,
  transcript_id uuid references transcripts(id) on delete set null,
  subject text not null,
  body text not null,
  status text not null default 'ready'
    check (status in ('ready', 'sent', 'discarded')),
  generated_by text default 'agent',  -- 'agent' | 'manual' | future: 'operator-refined'
  created_at timestamptz default now(),
  sent_at timestamptz,
  resend_id text,
  gmail_message_id text
);

create index if not exists idx_email_drafts_lead on email_drafts(lead_id);
create index if not exists idx_email_drafts_status on email_drafts(status);
create index if not exists idx_email_drafts_lead_ready
  on email_drafts(lead_id) where status = 'ready';
create index if not exists idx_email_drafts_created on email_drafts(created_at desc);

alter table email_drafts enable row level security;
create policy "allow_all_email_drafts"
  on email_drafts for all using (true) with check (true);
