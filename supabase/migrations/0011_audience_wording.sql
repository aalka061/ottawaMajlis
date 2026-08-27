-- "Open to all — recommended 16 and older" argued with itself. "Open to all"
-- says there is no restriction and "recommended" then adds one, so a parent
-- reading it for a fifteen-year-old could not tell whether they were welcome.
--
-- "Best suited to" is about who the material fits rather than who is allowed
-- in, which is what was meant, and it no longer contradicts the first half.
--
-- Run this once in the Supabase SQL editor. A row update, like 0005 to 0009 —
-- no DDL, so 0010 is still the only one that had to be run before deploying.

update programs
   set audience_note = 'Open to all — best suited to 16 and older'
 where slug = 'mapping-the-divine';
