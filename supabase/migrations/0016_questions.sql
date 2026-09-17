-- Questions and answers. Run this once in the Supabase SQL editor.
-- `schema.sql` already has the table, so a project created from scratch does
-- not need it.

-- People ask through the Q&A page, checked against the email they registered
-- with, and the answer appears there once it is answered and published. The
-- archive is the point of the thing: the same questions come round every term,
-- and a question answered in writing once should not have to be asked again.
--
-- One table carries both sides of a question. The private side — who asked,
-- and their words as they wrote them — never leaves the register. The public
-- side is what the Shaykh publishes: the question in its general form, and the
-- answer.
create table if not exists questions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  -- Who asked, from their registration. Private, always: a question is
  -- published without a name on it. Null when nobody asked — a question the
  -- Shaykh enters himself, because it was asked out loud after a session or
  -- came in by email from someone not on the register.
  asker_email text,
  asker_name text,

  -- Which program they were registered for, filled in from their registration
  -- rather than asked for. Null for a question that belongs to no term. The
  -- program going is not a reason to lose the question, so this is set null
  -- rather than cascading.
  program_id uuid references programs(id) on delete set null,

  -- Which session it came out of, if they said: "Session 4", "the in-person
  -- one", "last Tuesday". Free text, because sessions are not records here —
  -- `0008_drop_sessions.sql` took that table out — and a line anyone can write
  -- is worth more than a number nothing can check.
  session_note text,

  -- Their words, exactly as they were submitted. Never shown on the site.
  -- Kept beside the public wording rather than overwritten by it, so what was
  -- actually asked can always be read back.
  asked text not null default '',

  -- The question as it appears on the page. It starts as a copy of `asked`
  -- and is edited before publishing: a question asked about one person's own
  -- situation reads as a general ruling to the next person, and taking out
  -- what was personal is what makes the archive safe to leave up.
  question text not null default '',

  -- The written answer. With a recording, this is the two or three lines that
  -- say what the recording says — required either way, because audio cannot
  -- be skimmed, searched, quoted, or read by someone who cannot hear it.
  answer text not null default '',

  -- Where the recording lives in storage, null when the answer is written
  -- only.
  answer_audio text,

  -- new       it has arrived and has no answer yet
  -- answered  written, not on the site — a draft, or waiting on a second look
  -- published on the site
  -- closed    answered privately, or not one to publish
  status text not null default 'new'
    check (status in ('new', 'answered', 'published', 'closed')),

  -- Whether they asked to be told when it is answered. The telling is still a
  -- button someone presses, like every other letter here; this only records
  -- that they wanted it.
  notify boolean not null default false,
  notified_at timestamptz,

  answered_at timestamptz,
  published_at timestamptz
);

-- The public page reads the published ones, newest first, and nothing else.
create index if not exists questions_published_idx
  on questions (published_at desc)
  where status = 'published';

alter table questions enable row level security;
