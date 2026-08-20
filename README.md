# Ottawa Majlis

Registration site for Ottawa Majlis programs. People read the
program, register their interest, and you follow up to arrange payment. Once
their e-transfer arrives you mark them a paid member in the admin register.

Running cost: **$0/year**, plus a domain if you want one (~$12–15/year).

## What is in it

| Page | What it does |
| --- | --- |
| `/` | Ottawa Majlis, and the programs currently open |
| `/programs/[slug]` | The full program, and the interest form |
| `/admin` | The register: everyone who signed up, their status, your notes, CSV export, delete |
| `/admin/login` | One shared password |

A registration moves through five states: **interested** (they submitted the
form) → **contacted** (you emailed them the e-transfer details) → **paid —
member**. Two others are there when you need them: **waitlist** and
**withdrawn**.

Deleting a registration erases it for good and asks you to confirm first.
Withdrawn is the better choice for someone who simply dropped out — it keeps
the record. Delete is for spam and test rows.

How many people have registered is **never shown publicly** — an empty count
puts people off, and yours would lag reality anyway since payment arrives weeks
after interest. The circle on the public pages draws `capacity`, which is the
size of the group, not the number of sign-ups. The real numbers are in
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
   both tables and inserts the first program.
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

- `status` — `draft` hides it, `open` shows it and accepts registrations,
  `closed` keeps the page up but stops the form.
- `term` — the small red line above the title, e.g. "Eight weeks · sixteen
  sessions".
- `lede` — the opening question, set large under the title.
- `format_note`, `meeting_note`, `location`, `fee_note` — the four rows in
  "The details", shown as written.
- `capacity` — the size of the group. This is what the circle draws; it is
  not a count of registrations.
- `explore` — a JSON array of `{"title": "...", "body": "..."}` for the "What
  we will explore" section.
- `sessions` — a JSON array of `{"title": "...", "note": "..."}`, one per
  session, in order. Add `"part": "Weeks 3–4"` to a session to start a new
  part there, and `"part_title": "..."` to give that part a name.

To add a second program, insert another row with a new `slug`. It appears on
the home page automatically.

## Taking payment

Deliberately not built in. Interac e-transfer costs you nothing, where Stripe
would take about 3% of every fee, and you are already emailing each person
before they pay. When their transfer lands, set their status to **Paid —
member**.

If you later want cards, the place to add it is a "pay now" link in that email
rather than a checkout on this site.
