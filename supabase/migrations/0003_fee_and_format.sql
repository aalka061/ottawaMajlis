-- Fee is now $75 a month or $150 for the whole course, and the course is no
-- longer offered 1-on-1. Run this once in the Supabase SQL editor. `schema.sql`
-- already carries the new wording, so a project created from scratch does not
-- need this file.

update programs
   set fee_note = '$75 a month, or $150 for the whole course (2 months)',
       format_note = '2 months · 16 sessions · 1.5 hours each · 24 hours in total'
 where slug = 'mapping-the-divine';
