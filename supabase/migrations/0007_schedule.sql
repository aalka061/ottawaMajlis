-- The days and times, which had been "to be confirmed" since the program went
-- up. Nobody could reasonably send $150 without them.
--
-- The format line went with them: 8:45–10:00 pm is an hour and a quarter, not
-- the hour and a half it advertised, so sixteen sessions come to 20 hours
-- rather than 24. The schedule is the fact here; the total followed it.
--
-- The time carries ET. The course is online, and the phone field already
-- expects people registering from outside Canada.
--
-- Run this once in the Supabase SQL editor. Unconditional, like 0005 and 0006.

update programs
   set meeting_note = 'Mid-September to mid-November 2026 · Tuesdays and Thursdays · 8:45–10:00 pm ET',
       format_note  = '2 months · 16 sessions · 1 hour 15 minutes each · 20 hours in total'
 where slug = 'mapping-the-divine';
