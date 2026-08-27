# Ottawa Majless

Registration site for an Ottawa Majless program. The site is a single page
about whichever program is running: people read it, register, and send the fee
by Interac e-transfer. **The payment is the reservation** — there is no round of
messages in between asking for it. When their transfer arrives you mark them
paid in the admin register.

Running cost: **$0/year**, plus a domain if you want one (~$12–15/year).

## What is in it

| Page | What it does |
| --- | --- |
| `/` | The whole site: the open program, end to end, with the registration form |
| `/programs/[slug]` | The same page for a program that is not the open one — a draft, or one that has closed. Kept out of search results; it is there so you can read a program before you open it |
| `/admin` | The register: everyone who signed up, their status, your notes, CSV export, delete |
| `/admin/login` | One shared password |

A registration has two live states: **registered — unpaid** (they submitted the
form) → **paid — place held** (their e-transfer arrived). Two others are there
when you need them: **waitlist** and **withdrawn**. The database still stores
the first one under its old name, `interested`.

There used to be a **contacted** state in the middle, from when you messaged
people to ask for the fee. It is gone: the page tells people where to send the
e-transfer at the moment they register, so the only thing left to record is
whether the money arrived. `supabase/migrations/0004_payment_confirms.sql`
folds any old `contacted` rows back into registered.

Deleting a registration erases it for good and asks you to confirm first.
Withdrawn is the better choice for someone who simply dropped out — it keeps
the record. Delete is for spam and test rows.

How many people have registered is **never shown publicly** — an empty count
puts people off, and yours would lag reality anyway since payment arrives weeks
after someone signs up. The circle on the page draws `capacity`, which is the
size of the group, not the number of registrations. The real numbers are in
`/admin`.

## Running it locally

```bash
npm install
cp .env.example .env.local   # fill in the values below
npm run dev
```

Without Supabase keys the site still runs on the placeholder program in
`src/lib/seed.ts` — useful for editing copy — but the form cannot save anyone.

## Setting up the database (once, free)

1. Create a project at [supabase.com](https://supabase.com) — the free tier is
   enough for thousands of registrations.
2. Open the SQL editor, paste in `supabase/schema.sql`, run it. That creates
   both tables and inserts the first program. An existing database instead gets
   the files in `supabase/migrations/`, in order, once each.
3. Project settings → API. Copy the **Project URL** and the **service_role**
   key into `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
ADMIN_PASSWORD=pick-something-long
ADMIN_SESSION_SECRET=paste-output-of-openssl-rand-hex-32
```

The service role key bypasses row level security, so it stays on the server —
never put it in a `NEXT_PUBLIC_` variable and never commit `.env.local`.

## Putting it online (free)

1. Push this repository to GitHub.
2. Import it at [vercel.com](https://vercel.com) — the Hobby plan is free and
   fits this site comfortably.
3. Add the same four environment variables in the Vercel project settings.
4. Deploy. You get `something.vercel.app` for free; point your own domain at it
   later from the same screen if you buy one.

## Editing the program

Everything a visitor reads lives in the `programs` row — edit it in the
Supabase table editor. The fields that matter:

- `status` — `open` puts the program on the front page and accepts
  registrations, `closed` keeps the page up but stops the form, `draft` keeps
  it off the site entirely.
- `term` — the small red line above the title, e.g. "Starts mid-September
  2026".
- `lede` — the opening question, set large under the title.
- `format_note`, `meeting_note`, `location`, `fee_note` — the four rows
  beside the summary in "The course", shown as written.
- `capacity` — the size of the group. This is what the circle draws; it is
  not a count of registrations.
- `explore` — a JSON array of `{"title": "...", "body": "..."}` for the "What
  we will study" section, shown numbered in the order you write them. Add
  `"items": ["...", "..."]` to set a list under the body, and `"note": "..."`
  for a closing line after that list; both are optional.

The front page shows whichever program is `open` — the most recently created
one, if somehow two are. Adding a row is how you set up the next term: leave it
`draft` while you write it, then open it when the current one closes.

## Taking payment

Interac e-transfer to `ottawamajless@gmail.com`, and nothing else. It costs you
nothing, where Stripe would take about 3% of every fee.

The address lives in one place, `src/lib/site.ts`, and is written into the
registration steps, the panel beside the form, and the confirmation someone
sees after they submit. Change it there and it changes everywhere. Turn on
autodeposit for that inbox so nobody has to guess a security question.

People are asked to put their full name in the transfer message, which is how
you match a transfer to a row. When it lands, set their status to **Paid —
place held**.

If you later want cards, the place to add it is a checkout beside the
e-transfer panel in `src/components/PaymentPanel.tsx`.
