-- Payment is the confirmation. There is no longer a middle step where we
-- message people to ask for the fee, so `contacted` goes away: those rows are
-- registrations that have not been paid for, which is what `interested` means.
-- Run this once in the Supabase SQL editor. `schema.sql` already has the
-- narrower constraint, so a project created from scratch does not need it.

update registrations
   set status = 'interested'
 where status = 'contacted';

alter table registrations
  drop constraint if exists registrations_status_check;

alter table registrations
  add constraint registrations_status_check
  check (status in ('interested', 'confirmed', 'waitlist', 'withdrawn'));

-- The fee now names its own amounts; the e-transfer details sit beside the
-- registration form instead of inside this line.
update programs
   set fee_note = '$75 a month, or $150 for the whole course (2 months)'
 where slug = 'mapping-the-divine'
   and fee_note = '$75 a month, or $150 for the whole course (2 months), by e-transfer';
