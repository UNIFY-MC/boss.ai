-- Migration 017 — Internal CRM (B7)
-- Adds accounts (company-level entity) + pipeline fields on leads.
-- Hybrid model: each lead is a person belonging to one account.

-- ─────────────────────────── accounts ───────────────────────────
create table if not exists accounts (
  id uuid primary key default gen_random_uuid(),
  vertical_id uuid references verticals(id) on delete set null,
  name text not null,
  domain text,
  industry text,
  employee_count_range text,
  revenue_range text,
  location text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists accounts_vertical_idx on accounts(vertical_id);
create index if not exists accounts_domain_idx on accounts(domain);
create index if not exists accounts_name_idx on accounts(lower(name));

alter table accounts enable row level security;

drop policy if exists allow_all_accounts on accounts;
create policy allow_all_accounts on accounts for all using (true) with check (true);

-- ─────────────────────────── leads pipeline fields ──────────────
alter table leads
  add column if not exists account_id uuid references accounts(id) on delete set null;
alter table leads
  add column if not exists deal_value_usd numeric(12, 2);
alter table leads
  add column if not exists next_action text;
alter table leads
  add column if not exists next_action_due date;
alter table leads
  add column if not exists pipeline_stage text default 'new';
alter table leads
  add column if not exists pipeline_stage_at timestamptz default now();
alter table leads
  add column if not exists trigger_event text;

alter table leads drop constraint if exists leads_pipeline_stage_check;
alter table leads add constraint leads_pipeline_stage_check
  check (pipeline_stage in (
    'new', 'contacted', 'qualified', 'meeting_set',
    'demo', 'negotiating', 'closed_won', 'closed_lost'
  ));

create index if not exists leads_pipeline_stage_idx on leads(pipeline_stage);
create index if not exists leads_next_action_due_idx on leads(next_action_due);
create index if not exists leads_account_idx on leads(account_id);

-- ─────────────────────────── backfill accounts from existing leads ──
-- Group leads by (vertical_id, company) → one account per group.
insert into accounts (vertical_id, name, domain, location)
select distinct on (l.vertical_id, lower(l.company))
  l.vertical_id,
  l.company,
  l.domain,
  l.location
from leads l
where l.company is not null and l.company <> ''
  and not exists (
    select 1 from accounts a
    where lower(a.name) = lower(l.company)
      and (a.vertical_id is not distinct from l.vertical_id)
  );

-- Link leads to their freshly-created accounts
update leads l
set account_id = a.id
from accounts a
where l.account_id is null
  and lower(a.name) = lower(l.company)
  and (a.vertical_id is not distinct from l.vertical_id);

-- ─────────────────────────── verify ──────────────────────────────
-- select count(*) as account_count from accounts;
-- select pipeline_stage, count(*) from leads group by pipeline_stage order by count desc;
-- select count(*) filter (where account_id is not null) as linked,
--        count(*) filter (where account_id is null) as unlinked
-- from leads;
