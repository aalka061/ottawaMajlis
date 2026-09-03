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
  -- Two live states: they have registered, and they have paid. Payment is what
  -- holds a place, so there is nothing in between.
  status text not null default 'interested'
    check (status in ('interested', 'confirmed', 'waitlist', 'withdrawn')),
  admin_note text,
  -- When the payment confirmation email went out, null until it has.
  payment_email_sent_at timestamptz,
  -- When the last payment reminder went out, null until one has. Only the
  -- latest is kept — a reminder may go more than once over a term.
  payment_reminder_sent_at timestamptz,
  created_at timestamptz not null default now()
);

-- One registration per person per program.
create unique index if not exists registrations_program_email_idx
  on registrations (program_id, lower(email));

create index if not exists registrations_status_idx on registrations (status);

alter table programs enable row level security;
alter table registrations enable row level security;

-- Mapping the Divine. Edit the text here or in the Supabase table editor.
-- The dates and location are placeholders — fill them in. Capacity is an
-- internal target only; the site never shows it and registration stays open.
insert into programs (
  slug, title, tagline, term, lede, summary, book_note, format_note, meeting_note,
  location, audience_note, fee_note, materials_note, capacity, teacher_name, teacher_bio, teacher_photo,
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
