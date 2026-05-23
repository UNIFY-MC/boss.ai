-- 010_brain_entries_document_source.sql
-- Allow 'document' as a brain_entries source so uploaded files can be
-- distinguished from typed manual insights and transcript-derived entries.

alter table brain_entries drop constraint if exists brain_entries_source_check;
alter table brain_entries add constraint brain_entries_source_check
  check (source in ('transcript', 'chat', 'manual', 'document'));
