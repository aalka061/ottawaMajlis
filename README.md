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

A registration has three live states: **registered — unpaid** (they submitted
the form) → **part paid — balance due** (some of the fee arrived) → **paid —
place held** (all of it did). Two others are there when you need them:
**waitlist** and **withdrawn**. The database still stores the first one under
its old name, `interested`.

You set these from the dropdown as the money arrives. Most fees come in one
transfer, and marking someone **paid — place held** is the whole of writing that
down: the register records their balance as a transfer, so one press leaves both
the status and the money behind it on the row.

Choosing it asks one thing — the day the money landed, today unless you say
otherwise. The field appears when you pick **paid** and only then, so a row you
are waitlisting or writing a note on is the plain status and note it always was.

**Part paid — balance due** is the one that asks for more. It opens the
instalment record under their name, and once you are keeping that record the
status follows it — the transfer that finishes the fee marks them paid on its
own.

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
- `fee_amount` — the same fee as a plain number, e.g. `150`. Never shown on
  the site. It is what the register works balances out from, so a part payment
  knows what is still owed. Leave it empty and the register records what
  arrives without claiming what is left.
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
you match a transfer to a row. When the whole fee lands, mark them **paid —
place held**, check the day, and you are done — the amount writes itself down.
When only part of it does, set them **part paid — balance due** and record the
instalments under **The money** as they arrive.

If you later want cards, the place to add it is a checkout beside the
e-transfer panel in `src/components/PaymentPanel.tsx`.

## Paying in instalments

Not everyone sends $150 at once. Set someone **part paid — balance due** and
**The money** appears under their name: every transfer that has arrived, what
that leaves owing, and the day the next one is expected.

It is only on those rows. A row that has paid needs no itemising, and a row
that has sent nothing has no instalments to itemise — four empty money fields
on either one is a form asking to be filled in for an arrangement nobody made,
which is how the register came to look like it wanted something from you on
every line.

Recording a transfer takes an **amount**, the **day it was received** (today,
unless you say otherwise — the day money lands is rarely the day you read the
inbox), an optional note for what it was, and the **next payment due** date.
Press Record and what is owed is worked out again. The transfer that meets the
fee makes them **paid — place held**, and **The money** folds away with the
status that held it open — the balance is settled, so there is nothing left to
keep a record of. It is all worked out from `fee_amount` on their program, so
set that first or no balance can be known.

The amount may be left empty. Then nothing is recorded as received and only
the due date moves — for an arrangement agreed before any of it has been sent,
or one that changes later.

Recording only ever moves someone forward. Money that has arrived overrules the
status, and money that has not leaves it where you put it — so an arrangement
with nothing against it yet keeps its record open instead of closing itself as
soon as you save the date.

**Remove** takes a payment back off a row, and asks first. It is for a figure
typed wrong. The balance is worked out again afterwards, so removing the
transfer that settled someone returns them to **part paid — balance due**, and
removing the only transfer on a row leaves it part paid with an empty record,
ready for the figure you meant.

To reach the record on someone already **paid** — to read back which day a
transfer landed, to fix a date, or to take one off — set them **part paid —
balance due** again and it comes back with every transfer still on it. Nothing
was deleted; the record follows the status, and the CSV export never hides it
either way.

That is also the way to undo a wrong press. Going straight from **paid** back to
**registered — unpaid** leaves the transfer the register wrote sitting on a row
that shows no record, so go by way of **part paid**, remove it, and carry on
from there.

A malformed date is not worth losing a press over, so one falls back to today
rather than refusing the save — the status is the thing you came to change.

Two figures sit at the top of the register: **received** and **still owed**,
across everyone registered, part paid, or paid. The waitlist and the withdrawn
are in neither — a withdrawn person's part payment is a refund waiting to go
out, not income.

Both are read off the transfers, because every route to **paid** leaves one
behind: an instalment you recorded, or the balance the register wrote when you
marked the person paid. Someone **part paid** counts what has arrived and owes
the rest. Someone **paid** owes nothing.

The one place the fee stands in for a transfer is a row marked paid *before* the
register started writing the balance down. Those rows have no payments behind
them, so their fee is counted as received — and because that figure is read from
the program rather than the row, editing `fee_amount` mid-term moves it. Newer
rows are immune, being read off the transfer itself.

The CSV export is the itemised view, a person at a time, as plain figures a
spreadsheet will sum. It reads straight from the payments table, so it carries
every transfer on the register — including the ones on a paid row, whose record
is not shown on the page.

### Writing to someone part way through

Beside anyone **part paid** there are three letters. Each is its own button and
each button says what it does — which letter goes out is never inferred from the
state of the row.

All three open the same way: what arrived, the day it landed, and where the fee
stands. They differ in how they end.

**Send receipt** reports. It ends on the arrangement as it stands — "the rest is
expected by 15 Oct 2026" where a date is written down, and simply "send the
balance when you are able" where none is. Send it when you record a payment.

**Ask when the rest comes** asks. With no date written down it asks them to name
one, before the program reaches its midpoint, so the enrolment can be confirmed
for the full course. With a date already down it asks whether that day still
suits. This is the letter to send once a first instalment lands and nothing has
been agreed — the place is otherwise being held against nothing.

**Ask for the balance** is the ordinary overdue reminder, below.

On someone's first instalment the receipt and the question both open by welcoming
them to the program by name, with the teacher's. Later ones do not: it is a warm
thing to read once and an odd thing to read again beside a third letter.

Nothing is automatic. Recording a payment writes nothing to anybody.

### Reading a letter before you send it

Beside every send button is a **?**. It opens that person's own copy of the
letter — the subject and the full text, built from their program and their
payments, with their amounts and their dates in it. It is the letter, not a
description of one, so it cannot drift out of step with what actually goes.

Where a letter could not be sent, the **?** is not offered. The receipt and the
question both thank someone for money, so on a part paid row with nothing
recorded against it they are refused, and the row says so instead of showing you
a letter that would bounce off the send.

**Ask for the balance** is the ordinary overdue reminder, and it knows about
their payments: it asks for the outstanding amount rather than the fee, and thanks
them for what already arrived first, so it cannot read as though their
instalments went unnoticed. Send it when a due date has gone by.

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

**Remind who owes** at the top of the register does the whole round at once.
It shows you who is about to be written to, what each of them owes, and when
each was last reminded, before it sends anything. Each letter is built from
that person's own program and their own payments, so someone still unpaid from
a previous term is not sent this term's fee, and someone half way through
paying is asked for their balance rather than the whole of it. Sends are paced to stay inside Resend's rate limit, about a second each,
and every row is marked as its own send succeeds — so if the round fails
halfway, pressing it again reaches whoever is still unpaid.

Nothing goes out on a schedule. A reminder is sent when you decide to send one.

The button is there for the two states that still owe — **registered — unpaid**
and **part paid — balance due**. Someone paid gets the confirmation instead,
and nobody waitlisted or withdrawn is being asked for money.

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
any one message: `sendEmail` is the plumbing, and `paymentConfirmation`,
`paymentReminder` and `partPaymentReceipt` are the three letters. A later feature that writes to everyone
on a program — schedule changes, the Zoom link when it exists — adds its own
message beside them and sends it the same way.
