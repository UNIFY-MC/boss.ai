-- 006_runs_result_json.sql
-- Adds a result_json column to runs so the vertical-builder can run async:
-- the worker returns 202 immediately, then writes the generated config here
-- when reasoning completes. Cockpit polls this column.

alter table runs add column if not exists result_json jsonb;
