-- 008_operator_credentials.sql
-- Holds the operator's connected email-provider credentials (Gmail today,
-- Microsoft Graph later). refresh_token_encrypted is AES-256-GCM ciphertext
-- using a server-only CREDS_ENCRYPTION_KEY. The DB row alone is useless to
-- an attacker who lacks the key.
--
-- One row per provider for the single-operator hackathon demo. For
-- multi-tenant, add an operator_id FK and switch the unique constraint.

create table if not exists operator_credentials (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('gmail', 'outlook')),
  email text not null,
  display_name text,
  refresh_token_encrypted text not null,
  scopes text[],
  connected_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (provider)
);

alter table operator_credentials enable row level security;
create policy "allow_all_operator_credentials"
  on operator_credentials for all using (true) with check (true);
