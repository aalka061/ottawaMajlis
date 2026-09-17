-- Ottawa Majless — run this once in the Supabase SQL editor.
-- Row level security is on with no public policies, so the anon key can read
-- nothing. The app talks to these tables with the service role key from the
-- server only.

create extension if not exists "pgcrypto";

create table if not exists programs (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  title_ar text,
  tagline text not null default '',
  term text not null default '',
  lede text,
  summary text not null default '',
  book_note text not null default '',
  format_note text not null default '',
  meeting_note text not null default '',
  location text not null default '',
  audience_note text not null default '',
  fee_note text not null default '',
  -- The fee as a number, beside the prose above. The prose is what visitors
  -- read; this is what balances are worked out from in the register. Null
  -- means no amount is set, and no balance is claimed.
  fee_amount numeric(10, 2) check (fee_amount is null or fee_amount >= 0),
  -- Read only in the payment confirmation email, not on the site: what
  -- has not been sent yet, and roughly when it will be.
  materials_note text not null default '',
  capacity integer not null default 20,
  registration_note text,
  teacher_name text,
  teacher_bio text,
  teacher_photo text,
  teacher_url text,
  teacher_credentials jsonb not null default '[]'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'open', 'closed')),
  explore jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists registrations (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references programs (id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text,
  heard_from text,
  note text,
  -- Three live states: they have registered, some of the fee has arrived, and
  -- the whole of it has. Payment is what holds a place, so the middle state is
  -- money on the table and a balance still owed.
  status text not null default 'interested'
    check (status in ('interested', 'partial', 'confirmed', 'waitlist', 'withdrawn')),
  admin_note text,
  -- When the payment confirmation email went out, null until it has.
  payment_email_sent_at timestamptz,
  -- When the last payment reminder went out, null until one has. Only the
  -- latest is kept — a reminder may go more than once over a term.
  payment_reminder_sent_at timestamptz,
  -- When the last part-payment receipt went out, null until one has. Like the
  -- reminder it may go once per instalment, so only the latest is kept.
  part_payment_email_sent_at timestamptz,
  date_request_email_sent_at timestamptz,
  -- When the next instalment is expected, null when none is. An arrangement,
  -- not a rule: nothing enforces it and nothing is sent on it.
  next_payment_due date,
  created_at timestamptz not null default now()
);

-- Every transfer that has arrived, one row each. A list rather than a running
-- total: instalments land on their own days, and the question you ask of the
-- register is what came in and when.
create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references registrations (id) on delete cascade,
  amount numeric(10, 2) not null check (amount > 0),
  -- The day the money landed, which is not the day it was recorded.
  received_on date not null default current_date,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists payments_registration_idx
  on payments (registration_id, received_on);

-- Questions and answers. People ask through the Q&A page, checked against the
-- email they registered with, and an answer appears there once it is written
-- and published. The archive is the point: the same questions come round every
-- term, and one answered in writing should not have to be asked again.
--
-- One table carries both sides. The private side — who asked, and their words
-- as they wrote them — never leaves the register. The public side is what is
-- published: the question in its general form, and the answer.
create table if not exists questions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  -- Who asked, from their registration. Private, always: a question is
  -- published without a name on it. Null when nobody asked — a question
  -- entered here because it was asked out loud, or came in by email from
  -- someone not on the register.
  asker_email text,
  asker_name text,
  -- Their program, filled in from their registration rather than asked for.
  -- Set null rather than cascading: the term ending is not a reason to lose
  -- the question.
  program_id uuid references programs (id) on delete set null,
  -- Which session it came out of, if they said. Free text — sessions are not
  -- records here, and a line anyone can write beats a number nothing checks.
  session_note text,
  -- Their words, as submitted. Never shown on the site, and never overwritten
  -- by the public wording, so what was asked can always be read back.
  asked text not null default '',
  -- The question as it appears on the page: the same question with what was
  -- personal taken out. A question asked about one person's situation reads as
  -- a general ruling to the next person.
  question text not null default '',
  -- The written answer, or — with a recording — the two or three lines that
  -- say what the recording says. Required either way: audio cannot be skimmed,
  -- searched, quoted, or read by someone who cannot hear it.
  answer text not null default '',
  answer_audio text,
  -- How long the recording runs, for the label on the list. Null for one
  -- linked from elsewhere, which is not ours to measure.
  answer_audio_seconds integer,
  -- new: arrived, unanswered. answered: written, not on the site.
  -- published: on the site. closed: answered privately, or not one to publish.
  status text not null default 'new'
    check (status in ('new', 'answered', 'published', 'closed')),
  -- Whether they asked to be told when it is answered. The telling is still a
  -- button someone presses, like every other letter here.
  notify boolean not null default false,
  notified_at timestamptz,
  answered_at timestamptz,
  published_at timestamptz
);

-- What belongs to the site rather than to any one program. One row: the
-- `id boolean check (id)` makes a second one impossible, and settings that can
-- exist twice get read from the wrong one eventually.
create table if not exists settings (
  id boolean primary key default true check (id),
  -- Whether the form at the bottom of /questions takes anything. False leaves
  -- the archive exactly as it was and puts a note where the form stood. It
  -- never closes the register's own way in: a question asked out loud after a
  -- session is still typed into /admin/questions.
  questions_open boolean not null default true
);

-- The public page reads the published ones, newest first, and nothing else.
create index if not exists questions_published_idx
  on questions (published_at desc)
  where status = 'published';

-- One registration per person per program.
create unique index if not exists registrations_program_email_idx
  on registrations (program_id, lower(email));

create index if not exists registrations_status_idx on registrations (status);

alter table programs enable row level security;
alter table registrations enable row level security;
alter table payments enable row level security;
alter table questions enable row level security;
alter table settings enable row level security;

-- The settings row itself. Everything reads it, nothing creates it.
insert into settings (id) values (true) on conflict (id) do nothing;

-- Mapping the Divine. Edit the text here or in the Supabase table editor.
-- The dates and location are placeholders — fill them in. Capacity is an
-- internal target only; the site never shows it and registration stays open.
insert into programs (
  slug, title, tagline, term, lede, summary, book_note, format_note, meeting_note,
  location, audience_note, fee_note, fee_amount, materials_note, capacity, teacher_name, teacher_bio, teacher_photo,
  teacher_url, teacher_credentials, status, explore
) values (
  'mapping-the-divine',
  'Mapping the Divine',
  'An 8-week journey into classical logic and sacred thought',
  'Starts mid-September 2026',
  'Have you ever wondered how classical thinkers reasoned through life''s deepest questions? How do we talk about existence, purpose, and reality using pure logic, without relying strictly on dogma?',
  'Mapping the Divine is an interactive group course designed for anyone curious about the bridge between intellect and spirituality. Over eight weeks we work through al-‘Aqida al-Sanusiyya al-Sughra — the short creed of Imam Muhammad ibn Yusuf al-Sanusi, known everywhere as Umm al-Barahin, the Mother of Proofs — a timeless masterpiece that uses formal logic to investigate the Divine and the human condition. Whether you are seeking to deepen your personal faith, explore classical philosophy, or simply engage with an ancient rational tradition in an open, welcoming environment, this workshop offers a space for meaningful conversation and critical inquiry.',
  'al-‘Aqida al-Sanusiyya al-Sughra by Imam al-Sanusi — known as Umm al-Barahin, the Mother of Proofs',
  '2 months · 16 online sessions of 1 hour 15 minutes · 2 in-person sessions of 2 hours · 24 hours in total',
  'Mid-September to mid-November 2026 · Tuesdays and Thursdays · 8:45–10:00 pm ET',
  'Online, plus one in-person session per month',
  'Open to all — best suited to 16 and older',
  '$150 for the whole course (2 months)',
  150,
  'The Zoom link and the course materials come to you closer to 15 September.',
  20,
  'Shaykh Zakaria AbdilAziz',
  'Shaykh Zakaria AbdilAziz heads Muraqabah’s academic vision and is a graduate of the distinguished Alimiyyah program at Dar al-Mustafa in Tarim, Yemen, where he spent nearly two decades immersed in the traditional curriculum.',
  '/shaykh-zakaria.webp',
  'https://www.muraqabah.ca/',
  '[
    "Graduate of the Alimiyyah program at Dar al-Mustafa, Tarim, Yemen",
    "Nearly two decades of traditional study under eminent scholars, including Habib Umar bin Hafiz",
    "Formal authorizations (ijazat), including Hadith and Shafi’i jurisprudence"
  ]'::jsonb,
  'open',
  '[
    {"title": "The Rulings of the Intellect", "body": "Understanding the three fundamental rulings of the intellect:", "items": ["Wajib — that which must be", "Mustahil — that which cannot be", "Ja’iz — that which may or may not be"]},
    {"title": "Knowing Allah", "body": "An introduction to the rational obligation of knowing Allah and the proofs that establish His existence, perfection, and transcendence."},
    {"title": "The Divine Attributes", "body": "Studying the necessary attributes of Allah ﷻ, including:", "items": ["Existence", "Beginninglessness", "Everlastingness", "His non-resemblance to anything", "His Self-Sufficiency", "His Oneness"], "note": "And the remaining attributes traditionally studied within the science of Aqidah."},
    {"title": "The Attributes of Meaning", "body": "Exploring Allah’s:", "items": ["Power", "Will", "Knowledge", "Life", "Hearing", "Seeing", "Speech"]},
    {"title": "The Relationship Between Revelation and Reason", "body": "Understanding the role of sound intellect and transmitted revelation in understanding matters of creed."},
    {"title": "Prophethood", "body": "An introduction to the necessity of messengers, their attributes, their truthfulness, and the rational proofs establishing their mission."},
    {"title": "Miracles", "body": "Understanding the meaning of a miracle and its role as a confirmation."},
    {"title": "Matters Known Through Revelation", "body": "Lastly, an introduction to realities whose knowledge is established through revelation."}
  ]'::jsonb
)
on conflict (slug) do nothing;
