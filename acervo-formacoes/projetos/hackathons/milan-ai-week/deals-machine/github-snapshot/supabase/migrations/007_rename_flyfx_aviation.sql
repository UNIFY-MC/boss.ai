-- 007_rename_flyfx_aviation.sql
-- Rename the original FlyFX seed to "Aviation Vertical" — used as the
-- cargo-charter demo case in the hackathon presentation. Slug stays the
-- same so existing run/lead/brain links don't break.

update verticals
set display_name = 'Aviation Vertical'
where slug = 'flyfx';
