-- How long a recorded answer runs, in seconds. Run this once, after 0016.

-- Shown beside a question before it is opened — "Spoken · 4 min" — so nobody
-- has to open an answer to find out whether they have time for it, and nobody
-- on a bus starts a five-minute one by accident.
--
-- Written when a recording is kept, from the browser that has just decoded it.
-- Null for a recording linked from somewhere else: it is not ours to measure,
-- and the label simply says "Spoken" instead.
alter table questions
  add column if not exists answer_audio_seconds integer;
