-- Closing the question form while the answers stay up. Run this once in the
-- Supabase SQL editor.

-- The questions page does two things, and until now they went together: it is
-- the archive of what has been answered, and it is the form for asking. They
-- come apart between terms. The archive is the part worth leaving up forever —
-- the same questions come round every term — but there is no circle to ask
-- from when nothing is running, and a form that takes a question nobody will
-- answer for two months is worse than a form that says so.
--
-- One row, holding what belongs to the site rather than to any one program.
-- The `id boolean check (id)` makes a second row impossible: settings that can
-- exist twice get read from the wrong one eventually.
create table if not exists settings (
  id boolean primary key default true check (id),

  -- Whether the form at the bottom of /questions takes anything. False leaves
  -- the archive exactly as it was and puts a note where the form stood.
  -- Never closes the register's own way in: a question asked out loud after a
  -- session is still typed into /admin/questions, which is not this form and
  -- does not ask this.
  questions_open boolean not null default true
);

-- The row itself. Everything reads it, nothing creates it.
insert into settings (id) values (true) on conflict (id) do nothing;

alter table settings enable row level security;
