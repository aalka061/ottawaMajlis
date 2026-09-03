-- The payment reminder: one click in the register writes to someone who has
-- registered but whose e-transfer has not arrived. Run this once in the
-- Supabase SQL editor. `schema.sql` already has the column, so a project
-- created from scratch does not need it.

-- When the last reminder went out, null until one has. Only the latest is
-- kept: a reminder is a nudge and may be sent more than once over a term, and
-- what matters when you are deciding whether to send another is how long ago
-- the last one was, not how many there have been.
alter table registrations
  add column if not exists payment_reminder_sent_at timestamptz;
