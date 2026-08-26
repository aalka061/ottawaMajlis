-- The fee is the whole course, paid once. Naming a monthly rate beside it read
-- as a choice between the two, and someone could reasonably have sent $75 and
-- believed their place was held. Run this once in the Supabase SQL editor.
--
-- Unconditional, unlike 0003: it has to land on the right value whether or not
-- the earlier migrations were ever run.

update programs
   set fee_note = '$150 for the whole course (2 months)'
 where slug = 'mapping-the-divine';
