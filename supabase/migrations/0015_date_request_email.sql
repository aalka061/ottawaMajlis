-- "Ask when the rest comes": the letter that goes to someone part way through a
-- fee to ask which day the balance is coming. Run this once in the Supabase SQL
-- editor. `schema.sql` already has the column, so a project created from
-- scratch does not need it.

-- The register sends three letters to a part payer now — a receipt, this
-- question, and the overdue reminder — and each keeps its own date so the
-- button can say when it last went out. Sharing one column made all three
-- claim the same date, which is worse than none: it reads as though you have
-- already asked when you have only sent a receipt.
alter table registrations
  add column if not exists date_request_email_sent_at timestamptz;
