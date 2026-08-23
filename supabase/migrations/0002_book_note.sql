-- Adds the book being read as the first row of the details strip.
-- Run this once in the Supabase SQL editor. `schema.sql` already has the
-- column, so a project created from scratch does not need this file.

alter table programs
  add column if not exists book_note text not null default '';

update programs
   set book_note = 'al-‘Aqida al-Sanusiyya al-Sughra by Imam al-Sanusi — known as Umm al-Barahin, the Mother of Proofs'
 where slug = 'mapping-the-divine'
   and book_note = '';
