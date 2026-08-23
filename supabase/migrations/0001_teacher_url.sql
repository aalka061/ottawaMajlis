-- Adds the teacher's own website, linked from their name on the page.
-- Run this once in the Supabase SQL editor. `schema.sql` already has the
-- column, so a project created from scratch does not need this file.

alter table programs add column if not exists teacher_url text;

update programs
   set teacher_url = 'https://www.muraqabah.ca/'
 where slug = 'mapping-the-divine'
   and teacher_url is null;
