-- The format line counted only the online sessions. Two sessions a week over
-- eight weeks is all sixteen of them, so the monthly in-person session that
-- `location` promises is a seventeenth and eighteenth on top — two of them
-- across the two months, two hours each.
--
-- 16 × 1h15m = 20 hours, + 2 × 2h = 4 hours, so 24 hours in total. That is
-- where the original figure came from, before 0007 corrected the online
-- sessions from an hour and a half to an hour and a quarter and left the
-- in-person ones out.
--
-- Run this once in the Supabase SQL editor. Unconditional, like 0005 to 0007.

update programs
   set format_note = '2 months · 16 online sessions of 1 hour 15 minutes · 2 in-person sessions of 2 hours · 24 hours in total'
 where slug = 'mapping-the-divine';
