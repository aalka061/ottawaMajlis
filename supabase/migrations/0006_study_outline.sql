-- The eight topics of "What we will study", replacing the four short teasers
-- the program opened with. They are the syllabus as the teacher wrote it, in
-- order — the section is numbered on the page now, and the last one reads
-- "Lastly", so the order is content, not decoration.
--
-- Three of them carry an "items" list and one a closing "note"; both are new
-- optional keys on an explore entry, and older entries without them still
-- render. Run this once in the Supabase SQL editor.
--
-- Unconditional, like 0005: it has to land on the right value whether or not
-- the earlier migrations were ever run.

update programs
   set explore = '
  [
      {"title": "The Rulings of the Intellect", "body": "Understanding the three fundamental rulings of the intellect:", "items": ["Wajib — that which must be", "Mustahil — that which cannot be", "Ja’iz — that which may or may not be"]},
      {"title": "Knowing Allah", "body": "An introduction to the rational obligation of knowing Allah and the proofs that establish His existence, perfection, and transcendence."},
      {"title": "The Divine Attributes", "body": "Studying the necessary attributes of Allah ﷻ, including:", "items": ["Existence", "Beginninglessness", "Everlastingness", "His non-resemblance to anything", "His Self-Sufficiency", "His Oneness"], "note": "And the remaining attributes traditionally studied within the science of Aqidah."},
      {"title": "The Attributes of Meaning", "body": "Exploring Allah’s:", "items": ["Power", "Will", "Knowledge", "Life", "Hearing", "Seeing", "Speech"]},
      {"title": "The Relationship Between Revelation and Reason", "body": "Understanding the role of sound intellect and transmitted revelation in understanding matters of creed."},
      {"title": "Prophethood", "body": "An introduction to the necessity of messengers, their attributes, their truthfulness, and the rational proofs establishing their mission."},
      {"title": "Miracles", "body": "Understanding the meaning of a miracle and its role as a confirmation."},
      {"title": "Matters Known Through Revelation", "body": "Lastly, an introduction to realities whose knowledge is established through revelation."}
    ]'::jsonb
 where slug = 'mapping-the-divine';
