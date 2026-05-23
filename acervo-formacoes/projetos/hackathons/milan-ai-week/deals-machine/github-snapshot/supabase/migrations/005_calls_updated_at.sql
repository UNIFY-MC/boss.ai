-- Migration 005: Fix the calls trigger by adding the column it expects.
--
-- Migration 004 declared `trg_calls_updated_at` which sets new.updated_at = now()
-- on every UPDATE, but the calls table was created without an updated_at column.
-- Every status update from Twilio's call-status webhook was failing silently,
-- leaving the row stuck at status='initiated' and the CallButton UI frozen on
-- "Initiating…".

alter table calls
  add column if not exists updated_at timestamptz default now();
