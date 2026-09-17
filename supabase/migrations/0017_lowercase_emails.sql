-- One shape for an email address. Run this once, after 0016.

-- The Q&A form asks for the address someone registered with and looks it up
-- as it was stored. Everything the site writes is lowercased on the way in,
-- and the unique index on registrations is on `lower(email)` — so the only
-- rows that can miss are ones typed into the Supabase table editor by hand,
-- in whatever case the person typing used. Someone whose row reads
-- `Ali@Example.com` would be told they are not on the register.
--
-- Nothing else reads the column case-sensitively, and the index means this
-- cannot collide with another row.
update registrations
   set email = lower(email)
 where email <> lower(email);
