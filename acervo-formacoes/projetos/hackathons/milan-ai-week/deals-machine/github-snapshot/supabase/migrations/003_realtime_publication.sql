-- Deals Machine — Universal Sales OS
-- Migration 003: Realtime publication
-- Reference: AI Week Italia/05-SYSTEM-ARCHITECTURE.md §4 (Realtime subscriptions section)
--
-- Supabase's default `supabase_realtime` publication needs the new tables
-- added explicitly. The cockpit subscribes to these for live updates:
--   - activity_log: streaming reasoning UI during a run
--   - runs:        Run button state, progress
--   - leads:       lead pile refreshes, HubSpot push status
--   - brain_entries: Brain panel count + recent insights

alter publication supabase_realtime add table activity_log;
alter publication supabase_realtime add table runs;
alter publication supabase_realtime add table leads;
alter publication supabase_realtime add table brain_entries;

-- Optional: also stream security flags so the security badge appears in real time
alter publication supabase_realtime add table security_flags;
