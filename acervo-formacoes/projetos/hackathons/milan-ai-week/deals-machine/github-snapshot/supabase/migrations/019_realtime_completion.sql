-- Migration 019 — complete the supabase_realtime publication
--
-- Earlier migrations added activity_log / runs / leads / brain_entries / calls
-- to the realtime publication, but three newer tables were missed. Without
-- being in the publication, INSERT/UPDATE events are silently dropped — the
-- cockpit subscribes but never receives anything.
--
--   - live_coaching_events: the coach loop writes here every 5s during a
--     call; the CoachPanel subscribes filtered by call_id. Without this
--     line, the panel stays silent for the entire call.
--   - email_drafts: auto-drafted after the post-call brain ingest. Without
--     this line, the draft hero card on the leads page only appears after
--     a manual page refresh.
--   - transcripts: not strictly required, but useful for surfacing
--     "transcript ready" the moment the row lands.

alter publication supabase_realtime add table live_coaching_events;
alter publication supabase_realtime add table email_drafts;
alter publication supabase_realtime add table transcripts;

-- verify (run in SQL editor):
-- select schemaname, tablename
-- from pg_publication_tables
-- where pubname = 'supabase_realtime'
-- order by tablename;
