-- The payment confirmation email: one click in the register sends it, and the
-- row remembers that it went out so nobody gets it twice.
-- Run this once in the Supabase SQL editor. `schema.sql` already has both
-- columns, so a project created from scratch does not need it.

-- Null until the email has been sent. It is the only record that it was: there
-- is no separate log, and re-sending overwrites the time with the later one.
alter table registrations
  add column if not exists payment_email_sent_at timestamptz;

-- The one line in that email about what has not been sent yet. It belongs to
-- the program because it moves with the term, the way every other date does.
alter table programs
  add column if not exists materials_note text not null default '';

-- Fill it in for the term that is running now. Keyed on status rather than on
-- a slug: the slug is the address of the page and outlives the program it was
-- named for, so it is the wrong thing to recognise a program by.
update programs
   set materials_note = 'The Zoom link and the course materials come to you closer to 15 September.'
 where status = 'open'
   and materials_note = '';
