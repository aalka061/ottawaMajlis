-- Partial payments: the fee can arrive in instalments, so the register keeps
-- every transfer that lands rather than one paid/unpaid flag, and holds the
-- date the next one is expected. Run this once in the Supabase SQL editor.
-- `schema.sql` already has all of it, so a project created from scratch does
-- not need this file.

-- The fee as a number, beside the prose `fee_note` that visitors read. The
-- prose stays the thing on the page — "$150 for the whole course (2 months)"
-- says more than 150 does — and this is what balances are worked out from.
-- Null means no amount has been set, and then the register shows what has
-- arrived without claiming to know what is still owed.
alter table programs
  add column if not exists fee_amount numeric(10, 2)
  check (fee_amount is null or fee_amount >= 0);

-- Read the first dollar amount out of the prose so existing programs start
-- with the right number instead of none. Look at what it picked before you
-- trust a balance: a fee written as a monthly rate lands here as the month,
-- not the term.
update programs
   set fee_amount = (substring(fee_note from '\$([0-9]+(?:\.[0-9]{1,2})?)'))::numeric
 where fee_amount is null
   and fee_note ~ '\$[0-9]';

-- Every transfer that has arrived, one row each. Kept as a list rather than a
-- running total because instalments arrive on their own days and the question
-- you actually ask of the register is "what has come in, and when" — a total
-- alone cannot answer it, and a total typed over itself loses the answer.
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

alter table payments enable row level security;

-- When the next instalment is expected, null when none is. It is an
-- arrangement, not a rule: nothing enforces it and nothing is sent on it.
alter table registrations
  add column if not exists next_payment_due date;

-- When the part-payment receipt last went out, null until one has. Like the
-- reminder it may go more than once — one for each instalment — so only the
-- latest time is kept.
alter table registrations
  add column if not exists part_payment_email_sent_at timestamptz;

-- A third live state between registered and paid: money has arrived and a
-- balance is still owed.
alter table registrations
  drop constraint if exists registrations_status_check;
alter table registrations
  add constraint registrations_status_check
  check (status in ('interested', 'partial', 'confirmed', 'waitlist', 'withdrawn'));
