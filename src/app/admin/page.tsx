import Link from "next/link";
import { redirect } from "next/navigation";
import { isSignedIn } from "@/lib/auth";
import {
  listPayments,
  listPrograms,
  listRegistrations,
  totalsByRegistration,
} from "@/lib/data";
import { formatMoney, settle, sumAmounts } from "@/lib/money";
import { isSupabaseConfigured } from "@/lib/supabase";
import {
  isOwing,
  STATUS_LABEL,
  STATUS_ORDER,
  statusLabel,
  type Payment,
  type RegistrationStatus,
} from "@/lib/types";
import { whatsappLink } from "@/lib/phone";
import {
  recordPayment,
  removePayment,
  removeRegistration,
  sendPartPaymentReceipt,
  sendPaymentConfirmation,
  sendPaymentReminder,
  signOut,
  updateRegistration,
} from "./actions";
import { MoneyPanel } from "./MoneyPanel";
import { SendMailButton } from "./SendMailButton";
import { SendRemindersButton } from "./SendRemindersButton";

export const dynamic = "force-dynamic";

/**
 * The one slow thing on this page is a round of reminders, paced to stay
 * inside the mail server's rate limit — about a second a person. 60 seconds is
 * the most a Vercel Hobby function is given. A round that runs past it stops
 * part-way rather than failing as a whole: every letter that went out has
 * already marked its own row, so pressing the button again picks up the rest.
 */
export const maxDuration = 60;

const STATUS_TONE: Record<RegistrationStatus, string> = {
  interested: "border-brass text-brass",
  partial: "border-madder text-madder",
  confirmed: "border-madder bg-madder text-paper",
  waitlist: "border-slate text-slate",
  withdrawn: "border-line text-slate line-through",
};

/** A retired status still in the table reads as an unpaid registration. */
function statusTone(status: RegistrationStatus) {
  return STATUS_TONE[status] ?? STATUS_TONE.interested;
}

const PROGRAM_STATE: Record<"draft" | "open" | "closed", string> = {
  draft: "Draft — off the site",
  open: "Open — taking registrations",
  closed: "Closed — not taking registrations",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-CA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * A `date` column has no time in it, so it is read back at noon rather than
 * midnight. Midnight UTC is the evening before in Ottawa, and a due date that
 * shows a day early is worse than one that is not shown at all.
 */
function formatDay(isoDate: string) {
  return formatDate(`${isoDate}T12:00:00Z`);
}

type Params = {
  searchParams: Promise<{
    confirm_delete?: string;
    remind_all?: string;
    /** The payment the page is asking about before taking it off a row. */
    void_payment?: string;
  }>;
};

export default async function AdminPage({ searchParams }: Params) {
  if (!(await isSignedIn())) redirect("/admin/login");

  const {
    confirm_delete: confirmDelete,
    remind_all: remindAll,
    void_payment: voidPayment,
  } = await searchParams;

  if (!isSupabaseConfigured) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-20">
        <p className="rubric">Register</p>
        <h1 className="mt-4 font-display text-4xl leading-tight">
          The database is not connected.
        </h1>
        <p className="mt-4 text-slate">
          Run <code className="font-mono text-sm">supabase/schema.sql</code> in
          your Supabase project, then put{" "}
          <code className="font-mono text-sm">NEXT_PUBLIC_SUPABASE_URL</code>{" "}
          and{" "}
          <code className="font-mono text-sm">SUPABASE_SERVICE_ROLE_KEY</code>{" "}
          in your environment. Registrations appear here as soon as they can be
          saved.
        </p>
      </main>
    );
  }

  const [registrations, programs, payments] = await Promise.all([
    listRegistrations(),
    listPrograms(),
    listPayments(),
  ]);
  const programTitle = new Map(programs.map((p) => [p.id, p.title]));
  const programFee = new Map(programs.map((p) => [p.id, p.fee_amount]));

  // The whole payments table is read once and split up here. A term is tens
  // of people with two or three transfers each, so one query and a pass over
  // it beats a query a row.
  const paidByRow = totalsByRegistration(payments);
  const paymentsByRow = new Map<string, Payment[]>();
  for (const payment of payments) {
    const list = paymentsByRow.get(payment.registration_id) ?? [];
    list.push(payment);
    paymentsByRow.set(payment.registration_id, list);
  }

  /** Where one person's fee stands: what came in, against what is asked. */
  const settlementFor = (r: (typeof registrations)[number]) =>
    settle(paidByRow.get(r.id) ?? 0, programFee.get(r.program_id) ?? null);

  const counts = STATUS_ORDER.map((status) => ({
    status,
    count: registrations.filter((r) => r.status === status).length,
  }));

  // Everyone the reminder is for: still owing, whether nothing has arrived or
  // only part of it. Waitlisted and withdrawn people are not asked for money.
  const owing = registrations.filter((r) => isOwing(r.status));

  // The money across the register, counting only the people whose fee is
  // actually being collected — a withdrawn person's part payment is a refund
  // waiting to go out, not income, and belongs in neither figure.
  const live = registrations.filter(
    (r) => isOwing(r.status) || r.status === "confirmed",
  );
  const collected = sumAmounts(live.map((r) => paidByRow.get(r.id) ?? 0));
  const outstanding = sumAmounts(
    live.map((r) => settlementFor(r).outstanding ?? 0),
  );

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <p className="rubric">Ottawa Majless</p>
          <h1 className="mt-3 font-display text-4xl leading-tight">
            The register
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          {owing.length > 0 && !remindAll ? (
            <Link href="/admin?remind_all=1#remind-all" className="btn btn-quiet">
              Remind who owes ({owing.length})
            </Link>
          ) : null}
          <Link href="/admin/export" className="btn btn-quiet">
            Export CSV
          </Link>
          <form action={signOut}>
            <button type="submit" className="btn btn-quiet">
              Sign out
            </button>
          </form>
        </div>
      </div>

      <section className="mt-10 border-y border-line">
        <p className="rubric py-5">The programs</p>
        <ul className="divide-y divide-line border-t border-line">
          {programs.map((p) => (
            <li
              key={p.id}
              className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 py-5"
            >
              <div>
                <h2 className="font-display text-2xl leading-none">
                  {p.title}
                </h2>
                <p className="mt-2 font-mono text-xs text-slate">
                  {PROGRAM_STATE[p.status]} · fee: {p.fee_note || "not set"}
                </p>
              </div>
              <Link href={`/admin/programs/${p.id}`} className="btn btn-quiet">
                Edit the program
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <dl className="mt-12 grid grid-cols-2 gap-px border border-line bg-line sm:grid-cols-3 lg:grid-cols-5">
        {counts.map(({ status, count }) => (
          <div key={status} className="bg-paper px-4 py-5">
            <dt className="field-label">{STATUS_LABEL[status]}</dt>
            <dd className="mt-2 font-mono text-3xl">{count}</dd>
          </div>
        ))}
      </dl>

      <dl className="-mt-px grid grid-cols-2 gap-px border border-line bg-line">
        <div className="bg-paper px-4 py-5">
          <dt className="field-label">Received</dt>
          <dd className="mt-2 font-mono text-3xl">{formatMoney(collected)}</dd>
        </div>
        <div className="bg-paper px-4 py-5">
          <dt className="field-label">Still owed</dt>
          <dd className="mt-2 font-mono text-3xl">{formatMoney(outstanding)}</dd>
        </div>
      </dl>
      <p className="mt-3 max-w-prose text-sm text-slate">
        Across everyone registered, part paid, or paid — the waitlist and the
        withdrawn are left out of both figures. What is still owed is worked
        out from the fee amount on each program, so a program with no amount
        set adds nothing to it.
      </p>

      {remindAll ? (
        <section
          id="remind-all"
          className="mt-12 border border-madder bg-paper p-6 sm:p-8"
        >
          <p className="rubric">Payment reminders</p>
          {owing.length === 0 ? (
            <>
              <p className="mt-3 max-w-prose font-display text-2xl leading-snug">
                Nobody owes anything.
              </p>
              <p className="mt-3 max-w-prose text-sm text-slate">
                Every registration has either settled its fee or is off the
                register. There is nothing to send.
              </p>
              <div className="mt-5">
                <Link href="/admin" className="btn btn-quiet">
                  Back to the register
                </Link>
              </div>
            </>
          ) : (
            <>
              <p className="mt-3 max-w-prose font-display text-2xl leading-snug">
                Write to everyone whose fee is not settled?
              </p>
              <p className="mt-3 max-w-prose text-sm text-slate">
                Each letter is built from that person&rsquo;s own program and
                their own payments: someone who has sent nothing is asked for
                the fee, and someone part way through is asked for their
                balance and thanked for what already arrived. Every letter
                carries the e-transfer address and the line about putting a
                full name in the message, and says outright that a transfer
                sent in the last day or two has crossed with it. Record the
                money that has landed first and whoever is settled drops out
                of this list.
              </p>
              <ul className="mt-6 divide-y divide-line border-y border-line">
                {owing.map((r) => (
                  <li
                    key={r.id}
                    className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-3"
                  >
                    <span>
                      {r.full_name}{" "}
                      <span className="font-mono text-xs text-slate">
                        {r.email}
                      </span>
                    </span>
                    <span className="font-mono text-[0.6875rem] tracking-[0.14em] text-slate uppercase">
                      {settlementFor(r).outstanding !== null
                        ? `${formatMoney(settlementFor(r).outstanding ?? 0)} owed · `
                        : ""}
                      {r.payment_reminder_sent_at
                        ? `Last reminded ${formatDate(r.payment_reminder_sent_at)}`
                        : "Not reminded yet"}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-6 flex flex-wrap items-start gap-4">
                <SendRemindersButton count={owing.length} />
                <Link href="/admin" className="btn btn-quiet">
                  Not now
                </Link>
              </div>
            </>
          )}
        </section>
      ) : null}

      {registrations.length === 0 ? (
        <p className="mt-12 text-slate">
          Nobody has registered yet. Registrations land here the moment someone
          submits the form.
        </p>
      ) : (
        <ul className="mt-12 divide-y divide-line border-y border-line">
          {registrations.map((r) => (
            <li
              key={r.id}
              id={`r-${r.id}`}
              className="grid gap-6 py-7 md:grid-cols-[1.1fr_0.9fr]"
            >
              <div>
                <div className="flex flex-wrap items-baseline gap-3">
                  <h2 className="font-display text-2xl leading-none">
                    {r.full_name}
                  </h2>
                  <span
                    className={`border px-2 py-0.5 font-mono text-[0.625rem] tracking-[0.14em] uppercase ${statusTone(r.status)}`}
                  >
                    {statusLabel(r.status)}
                  </span>
                </div>
                <p className="mt-3 font-mono text-sm">
                  <a
                    href={`mailto:${r.email}`}
                    className="underline decoration-brass underline-offset-4 hover:text-madder"
                  >
                    {r.email}
                  </a>
                  {r.phone ? (
                    <>
                      <span className="text-slate"> · </span>
                      <a
                        href={whatsappLink(r.phone)}
                        target="_blank"
                        rel="noreferrer"
                        className="underline decoration-brass underline-offset-4 hover:text-madder"
                      >
                        {r.phone}
                      </a>
                    </>
                  ) : null}
                </p>
                <p className="mt-2 font-mono text-xs text-slate">
                  {programTitle.get(r.program_id) ?? "Unknown program"} ·
                  registered {formatDate(r.created_at)}
                  {r.heard_from ? ` · heard via ${r.heard_from}` : ""}
                </p>
                {r.next_payment_due && !settlementFor(r).settled ? (
                  <p className="mt-2 font-mono text-xs text-madder">
                    Next payment due {formatDay(r.next_payment_due)}
                  </p>
                ) : null}
                {r.note ? (
                  <p className="mt-3 max-w-prose border-l-2 border-line pl-3 text-sm text-slate">
                    {r.note}
                  </p>
                ) : null}
              </div>

              {confirmDelete === r.id ? (
                <div className="border border-madder bg-paper p-5">
                  <p className="font-display text-xl leading-snug">
                    Delete {r.full_name} permanently?
                  </p>
                  <p className="mt-2 max-w-prose text-sm text-slate">
                    This erases their name, email, phone, and every note on
                    them. It cannot be undone. If they simply dropped out, set
                    their status to Withdrawn instead — that keeps the record.
                  </p>
                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    <form action={removeRegistration}>
                      <input type="hidden" name="id" value={r.id} />
                      <button type="submit" className="btn btn-danger">
                        Delete permanently
                      </button>
                    </form>
                    <Link href="/admin" className="btn btn-quiet">
                      Keep
                    </Link>
                  </div>
                </div>
              ) : (
                <form action={updateRegistration} className="grid gap-3">
                  <input type="hidden" name="id" value={r.id} />
                  <div>
                    <label className="field-label" htmlFor={`status-${r.id}`}>
                      Status
                    </label>
                    <select
                      id={`status-${r.id}`}
                      name="status"
                      defaultValue={
                        STATUS_ORDER.includes(r.status)
                          ? r.status
                          : "interested"
                      }
                      className="field-input mt-2"
                    >
                      {STATUS_ORDER.map((status) => (
                        <option key={status} value={status}>
                          {STATUS_LABEL[status]}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1.5 max-w-prose text-sm text-slate">
                      The first three set themselves from the money below.
                      Change one by hand for a fee settled some other way —
                      recording a payment will set it again from what has
                      arrived.
                    </p>
                  </div>
                  <div>
                    <label className="field-label" htmlFor={`note-${r.id}`}>
                      Your note
                    </label>
                    <input
                      id={`note-${r.id}`}
                      name="admin_note"
                      defaultValue={r.admin_note ?? ""}
                      className="field-input mt-2"
                      placeholder="Paying in two instalments, agreed by phone"
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-5">
                    <button type="submit" className="btn btn-quiet">
                      Save
                    </button>
                    <Link
                      href={`/admin?confirm_delete=${r.id}#r-${r.id}`}
                      className="font-mono text-[0.6875rem] tracking-[0.14em] text-slate uppercase hover:text-madder"
                    >
                      Delete
                    </Link>
                  </div>
                </form>
              )}

              {confirmDelete === r.id ? null : (
                <MoneyPanel
                  registrationId={r.id}
                  payments={paymentsByRow.get(r.id) ?? []}
                  settlement={settlementFor(r)}
                  nextDue={r.next_payment_due}
                  recordAction={recordPayment}
                  removeAction={removePayment}
                  confirmRemoveHref={(paymentId) =>
                    `/admin?void_payment=${paymentId}#r-${r.id}`
                  }
                  keepHref={`/admin#r-${r.id}`}
                  confirmingId={voidPayment}
                />
              )}

              {confirmDelete === r.id ? null : (
                <div className="md:col-start-2">
                  {r.status === "confirmed" ? (
                    <>
                      <p className="field-label">Payment confirmation</p>
                      <p className="mt-1 max-w-prose text-sm text-slate">
                        Tells them the transfer arrived and their place is held.
                      </p>
                      <div className="mt-3">
                        <SendMailButton
                          action={sendPaymentConfirmation}
                          registrationId={r.id}
                          sentAt={r.payment_email_sent_at}
                          label="Send confirmation"
                          againLabel="Send it again"
                        />
                      </div>
                    </>
                  ) : r.status === "partial" ? (
                    <>
                      <p className="field-label">Their part payment</p>
                      <p className="mt-1 max-w-prose text-sm text-slate">
                        The receipt thanks them for what arrived and names the
                        balance and the next date. The reminder asks for the
                        balance — send that one when a date has gone by.
                      </p>
                      <div className="mt-3 grid gap-4">
                        <SendMailButton
                          action={sendPartPaymentReceipt}
                          registrationId={r.id}
                          sentAt={r.part_payment_email_sent_at}
                          label="Send receipt"
                          againLabel="Send it again"
                        />
                        <SendMailButton
                          action={sendPaymentReminder}
                          registrationId={r.id}
                          sentAt={r.payment_reminder_sent_at}
                          label="Ask for the balance"
                          againLabel="Ask again"
                        />
                      </div>
                    </>
                  ) : r.status === "interested" ? (
                    <>
                      <p className="field-label">Payment reminder</p>
                      <p className="mt-1 max-w-prose text-sm text-slate">
                        Asks them for the fee again — the amount, the address,
                        and their name in the transfer message.
                      </p>
                      <div className="mt-3">
                        <SendMailButton
                          action={sendPaymentReminder}
                          registrationId={r.id}
                          sentAt={r.payment_reminder_sent_at}
                          label="Send reminder"
                          againLabel="Remind again"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="field-label">Email</p>
                      <p className="mt-1 max-w-prose text-sm text-slate">
                        Nothing to send: the reminder asks for the fee and the
                        confirmation says a place is held, and neither is true
                        of someone {statusLabel(r.status).toLowerCase()}.
                      </p>
                    </>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
