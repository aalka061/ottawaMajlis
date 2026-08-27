-- The session-by-session outline is gone from the page. It listed the same
-- syllabus as "What we will study" in different words — "The Three Rulings of
-- the Mind" beside "The Rulings of the Intellect" — so a careful reader met
-- the course twice and had to work out that the two agreed. The eight topics
-- carry it now, and they are the teacher's own wording.
--
-- This one removes a column, and its contents cannot be recovered from the
-- database afterwards. Nothing reads the column any more, so the site is
-- correct whether or not you run this; it only tidies the table. The old
-- sixteen rows are in git history, in the parent of this commit.

alter table programs drop column if exists sessions;
