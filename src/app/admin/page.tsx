import Link from "next/link";
import { redirect } from "next/navigation";
import { isSignedIn } from "@/lib/auth";
import { listPrograms, listRegistrations } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/supabase";
import {
  STATUS_LABEL,
  STATUS_ORDER,
  statusLabel,
  type RegistrationStatus,
} from "@/lib/types";
import { whatsappLink } from "@/lib/phone";
import {
  removeRegistration,
  sendPaymentConfirmation,
  sendPaymentReminder,
  signOut,
  updateRegistration,
} from "./actions";
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

type Params = {
  searchParams: Promise<{ confirm_delete?: string; remind_all?: string }>;
};

export default async function AdminPage({ searchParams }: Params) {
  if (!(await isSignedIn())) redirect("/admin/login");

  const { confirm_delete: confirmDelete, remind_all: remindAll } =
    await searchParams;

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

  const [registrations, programs] = await Promise.all([
    listRegistrations(),
    listPrograms(),
  ]);
  const programTitle = new Map(programs.map((p) => [p.id, p.title]));

  const counts = STATUS_ORDER.map((status) => ({
    status,
    count: registrations.filter((r) => r.status === status).length,
  }));

  // Everyone the reminder is for: registered, and the transfer has not
  // arrived. Waitlisted and withdrawn people are not being asked for money.
  const unpaid = registrations.filter((r) => r.status === "interested");

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
          {unpaid.length > 0 && !remindAll ? (
            <Link href="/admin?remind_all=1#remind-all" className="btn btn-quiet">
              Remind the unpaid ({unpaid.length})
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

      <dl className="mt-12 grid grid-cols-2 gap-px border border-line bg-line sm:grid-cols-4">
        {counts.map(({ status, count }) => (
          <div key={status} className="bg-paper px-4 py-5">
            <dt className="field-label">{STATUS_LABEL[status]}</dt>
            <dd className="mt-2 font-mono text-3xl">{count}</dd>
          </div>
        ))}
      </dl>

      {remindAll ? (
        <section
          id="remind-all"
          className="mt-12 border border-madder bg-paper p-6 sm:p-8"
        >
          <p className="rubric">Payment reminders</p>
          {unpaid.length === 0 ? (
            <>
              <p className="mt-3 max-w-prose font-display text-2xl leading-snug">
                Nobody is unpaid.
              </p>
              <p className="mt-3 max-w-prose text-sm text-slate">
                Every registration has either been marked paid or is off the
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
                Write to everyone who has registered and not paid?
              </p>
              <p className="mt-3 max-w-prose text-sm text-slate">
                Each letter is built from that person&rsquo;s own program: the
                fee, the e-transfer address, and the line about putting their
                full name in the transfer message. It says outright that a
                transfer sent in the last day or two has crossed with it, so
                nobody who has just paid reads it as an accusation. Mark anyone
                whose money has landed as paid first and they drop out of this
                list.
              </p>
              <ul className="mt-6 divide-y divide-line border-y border-line">
                {unpaid.map((r) => (
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
                      {r.payment_reminder_sent_at
                        ? `Last reminded ${formatDate(r.payment_reminder_sent_at)}`
                        : "Not reminded yet"}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-6 flex flex-wrap items-start gap-4">
                <SendRemindersButton count={unpaid.length} />
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
                      placeholder="e-transfer received 12 Jan, $150 for the term"
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
