-- Ottawa Majlis — run this once in the Supabase SQL editor.
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
  format_note text not null default '',
  meeting_note text not null default '',
  location text not null default '',
  fee_note text not null default '',
  capacity integer not null default 20,
  registration_note text,
  teacher_name text,
  teacher_bio text,
  teacher_photo text,
  teacher_credentials jsonb not null default '[]'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'open', 'closed')),
  explore jsonb not null default '[]'::jsonb,
  sessions jsonb not null default '[]'::jsonb,
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
  status text not null default 'interested'
    check (status in ('interested', 'contacted', 'confirmed', 'waitlist', 'withdrawn')),
  admin_note text,
  created_at timestamptz not null default now()
);

-- One registration per person per program.
create unique index if not exists registrations_program_email_idx
  on registrations (program_id, lower(email));

create index if not exists registrations_status_idx on registrations (status);

alter table programs enable row level security;
alter table registrations enable row level security;

-- Mapping the Divine. Edit the text here or in the Supabase table editor.
-- The dates, location, fee, and capacity are placeholders — fill them in.
insert into programs (
  slug, title, tagline, term, lede, summary, format_note, meeting_note,
  location, fee_note, capacity, teacher_name, teacher_bio, teacher_photo,
  teacher_credentials, status, explore, sessions
) values (
  'mapping-the-divine',
  'Mapping the Divine',
  'An 8-week journey into classical logic and sacred thought',
  'Starts mid-September 2026',
  'Have you ever wondered how classical thinkers reasoned through life''s deepest questions? How do we talk about existence, purpose, and reality using pure logic, without relying strictly on dogma?',
  'Mapping the Divine is a 1-on-1 and group interactive course designed for anyone curious about the bridge between intellect and spirituality. Over eight weeks we work through the classical text known as The Mother of Proofs, a timeless masterpiece that uses formal logic to investigate the Divine and the human condition. Whether you are seeking to deepen your personal faith, explore classical philosophy, or simply engage with an ancient rational tradition in an open, welcoming environment, this workshop offers a space for meaningful conversation and critical inquiry.',
  '2 months · 16 sessions · 1.5 hours each · 24 hours in total · taken 1-on-1 or in a group',
  'Mid-September to mid-November 2026 · two sessions a week · days and times to be confirmed',
  'On Zoom, with two in-person meet-ups with the shaykh — one a month',
  'To be confirmed',
  20,
  'Shaykh Zakaria AbdilAziz',
  'Shaykh Zakaria AbdilAziz heads Muraqabah’s academic vision and is a graduate of the distinguished Alimiyyah program at Dar al-Mustafa in Tarim, Yemen, where he spent nearly two decades immersed in the traditional curriculum.',
  '/shaykh-zakaria.webp',
  '[
    "Graduate of the Alimiyyah program at Dar al-Mustafa, Tarim, Yemen",
    "Nearly two decades of traditional study under eminent scholars, including Habib Umar bin Hafiz",
    "Quran memorized in seven canonical recitations",
    "Formal authorizations (ijazat), including Hadith and Shafi’i jurisprudence"
  ]'::jsonb,
  'open',
  '[
    {"title": "The Tools of Logic", "body": "Discover the three universal categories of reason and how they shape human understanding."},
    {"title": "The Nature of Existence", "body": "Delve into how divine attributes such as eternity, unicity, and knowledge are articulated."},
    {"title": "Ethics & Revelation", "body": "Examine the rational foundations behind moral responsibility."},
    {"title": "Open Dialogue", "body": "Engage in weekly guided reflections connecting historical philosophy to modern questions of life."}
  ]'::jsonb,
  '[
    {"title": "Welcome & Orientation", "note": "The essentials, and unpacking the art of inquiry and sacred philosophy", "part": "Weeks 1–2", "part_title": "The Foundations of Reason & Inquiry"},
    {"title": "The Three Rulings of the Mind", "note": "Necessary, impossible, and possible"},
    {"title": "Moral Accountability & The Human Journey Toward Truth"},
    {"title": "Reason & Tradition", "note": "How ancient thinkers approached big questions"},
    {"title": "The Concept of Existence", "part": "Weeks 3–4"},
    {"title": "Time and Timelessness", "note": "Pre-eternity and continuity"},
    {"title": "Transcending the Material World", "note": "Distinctness and independence"},
    {"title": "The Idea of Oneness", "note": "Exploring unicity in classical thought"},
    {"title": "Divine Will & Power", "part": "Weeks 5–6"},
    {"title": "Unlimited Knowledge"},
    {"title": "Perception Beyond the Material", "note": "Hearing and sight"},
    {"title": "Perception Beyond the Material", "note": "Speech"},
    {"title": "The Harmony of Divine Attributes", "note": "Understanding the quasi-attributes, and the role of guides and teachers in human history", "part": "Weeks 7–8"},
    {"title": "Miracles, Proofs, and the Validation of Truth"},
    {"title": "The Core Message", "note": "Distilling creed into everyday wisdom"},
    {"title": "Closing Reflection", "note": "Integrating reason, logic, and personal conviction"}
  ]'::jsonb
)
on conflict (slug) do nothing;
