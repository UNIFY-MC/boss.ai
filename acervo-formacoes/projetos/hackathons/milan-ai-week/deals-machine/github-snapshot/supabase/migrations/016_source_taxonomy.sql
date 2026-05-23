-- 016_source_taxonomy.sql
-- Rename + tighten the brain_entries.source taxonomy:
--   Before: 'transcript' | 'chat' | 'manual' | 'document'
--   After:  'transcript' | 'manual' | 'document' | 'brain'
--
-- Semantic mapping:
--   - 'transcript' (unchanged) — derived from a call recording
--   - 'document'   (unchanged) — derived from an uploaded doc
--   - 'manual'     (now: ONLY operator-typed via the Add Insight modal)
--   - 'brain'      (new: agent-inferred — chat insights, outcome-tag
--                  derivations, wizard pre-seeds)
--
-- The pre-existing 'manual' bucket conflated three things: operator-typed
-- insights, outcome-derived rules (written by lib/brain-from-outcome),
-- and wizard pre-seed rows (written by generate-vertical). We can
-- distinguish the operator-typed ones because the Add Insight modal
-- never sets lead_id, while outcome-derived rows always do. Wizard
-- pre-seeds also have no lead_id, so they'll remain 'manual' after the
-- backfill — an acceptable loss since they're stale test data anyway.

alter table brain_entries drop constraint if exists brain_entries_source_check;

-- 'chat' is unambiguous — fold into 'brain'.
update brain_entries set source = 'brain' where source = 'chat';

-- 'manual' WITH a lead_id was always outcome-derived → 'brain'.
update brain_entries set source = 'brain' where source = 'manual' and lead_id is not null;

-- Lock in the new enum.
alter table brain_entries
  add constraint brain_entries_source_check
  check (source in ('transcript', 'manual', 'document', 'brain'));
