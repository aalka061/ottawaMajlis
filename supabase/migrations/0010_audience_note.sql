-- Who the course is for, as a row beside the other facts in "The course".
--
-- It replaces "The room it is read in" — three cards that said who comes and
-- how we read, in a friendly way that never answered the two questions people
-- actually ask before paying: may I come, and how old do you have to be.
--
-- Unlike 0005 to 0009 this one ADDS A COLUMN, so it cannot be applied from
-- the app the way a row update can. It has to be run in the Supabase SQL
-- editor, and it has to be run BEFORE the admin register can save a program
-- again — the form posts this field now, and an update naming a column that
-- does not exist fails.
--
-- The front page is fine either way: an empty audience_note simply drops the
-- row, the same as an empty location or fee.

alter table programs
  add column if not exists audience_note text not null default '';

update programs
   set audience_note = 'Open to all — recommended 16 and older'
 where slug = 'mapping-the-divine';
