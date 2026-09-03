# Ottawa Majless

Registration site for an Ottawa Majless program. The site is a single page
about whichever program is running: people read it, register, and send the fee
by Interac e-transfer. **The payment is the reservation** — nobody has to be
asked for it before they can pay. When their transfer arrives you mark them
paid in the admin register; when it does not, you send them a reminder from the
same page.

Running cost: **$0/year**, plus a domain if you want one (~$12–15/year).

## What is in it

| Page | What it does |
| --- | --- |
| `/` | The whole site: the open program, end to end, with the registration form |
| `/programs/[slug]` | The same page for a program that is not the open one — a draft, or one that has closed. Kept out of search results; it is there so you can read a program before you open it |
| `/admin` | The register: everyone who signed up, their status, your notes, the payment reminder and confirmation emails, CSV export, delete |
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
RESEND_API_KEY=re_...
EMAIL_FROM="Ottawa Majless <majless@your-verified-domain>"
```

The service role key bypasses row level security, so it stays on the server —
never put it in a `NEXT_PUBLIC_` variable and never commit `.env.local`.

## Putting it online (free)

1. Push this repository to GitHub.
2. Import it at [vercel.com](https://vercel.com) — the Hobby plan is free and
   fits this site comfortably.
3. Add the same six environment variables in the Vercel project settings.
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
- `format_note`, `meeting_note`, `location`, `audience_note`, `fee_note` —
  the rows beside the summary in "The course", shown as written. An empty one
  drops its row.
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

## Reminding someone who has not paid

Registration and payment are separate acts, so some people register and never
send the transfer. Beside anyone whose status is **Registered — unpaid** there
is a **Send reminder** button. It writes to them with the whole of what is
being asked — the amount from `fee_note`, the e-transfer address, and the line
about putting their full name in the transfer message — so they do not have to
go and find the original mail. It ends by saying that a transfer sent in the
last day or two has crossed with it, which is true often enough to be worth
saying: transfers land days after they are sent, and the register is only as
current as the last time you read the inbox.

The register shows the date the last one went out and offers to send another —
unlike the confirmation, a reminder is expected to be sent more than once over
a term. Only the latest date is kept; what you want to know before nudging
someone again is how long ago the last one was.

**Remind the unpaid** at the top of the register does the whole round at once.
It shows you who is about to be written to, and when each of them was last
reminded, before it sends anything. Each letter is built from that person's own
program, so someone still unpaid from a previous term is not sent this term's
fee. Sends are paced to stay inside Resend's rate limit, about a second each,
and every row is marked as its own send succeeds — so if the round fails
halfway, pressing it again reaches whoever is still unpaid.

Nothing goes out on a schedule. A reminder is sent when you decide to send one.

The button is only there for **Registered — unpaid**. Someone paid gets the
confirmation instead, and nobody waitlisted or withdrawn is being asked for
money.

## Confirming a payment

Once you have set someone to **Paid — place held**, a **Send confirmation**
button appears beside them in the register. It writes to them once: the money
arrived, the place is theirs, here is what they have secured, and the Zoom link
and materials come later. Nothing else — there is nothing for them to do.

The button is separate from the status on purpose. Marking someone paid is
bookkeeping; writing to them is not, and doing it by hand means you can settle
the money first and write when you mean to. The register shows the date it went
out under their name, and offers to send it again — the same person does
occasionally need a second copy.

What the email says comes from the program row, so it is right for whichever
term is running: the title, `meeting_note` for the dates and times, `location`,
and `materials_note` for the one line about what has not been sent yet. Edit
`materials_note` in the program editor at the start of each term.

Nothing is sent automatically, and nothing is sent to someone who has not been
marked paid — the email tells them their place is held, which is only true once
it is.

### Setting up sending

Email goes out through [Resend](https://resend.com) — the free tier is 3,000 a
month, far past what a term needs. You need a **domain verified in Resend** to
send from your own address; without one Resend only lets you send to yourself,
which is no use here.

1. Add and verify a domain in Resend (it gives you the DNS records to add).
2. Create an API key and put it in `RESEND_API_KEY`.
3. Set `EMAIL_FROM` to an address on that domain, e.g.
   `"Ottawa Majless <majless@yourdomain.ca>"`. Quote it — the angle brackets
   confuse a shell otherwise.

Replies do not go to `EMAIL_FROM`. Every message sets Reply-To to
`CONTACT_EMAIL` in `src/lib/site.ts`, which is the inbox the e-transfers land
in — so someone answering the confirmation reaches you where you already look.

The sending itself lives in `src/lib/email.ts`, kept apart from the wording of
any one message: `sendEmail` is the plumbing, `paymentConfirmation` and
`paymentReminder` are the two letters. A later feature that writes to everyone
on a program — schedule changes, the Zoom link when it exists — adds its own
message beside them and sends it the same way.
