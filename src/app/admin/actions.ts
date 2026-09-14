"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  endSession,
  isSignedIn,
  passwordIsCorrect,
  startSession,
} from "@/lib/auth";
import {
  addPayment,
  deletePayment,
  deleteRegistration,
  getProgramById,
  getRegistrationById,
  listPayments,
  listPaymentsFor,
  listRegistrations,
  markDateRequestEmailSent,
  markPartPaymentEmailSent,
  markPaymentEmailSent,
  markPaymentReminderSent,
  setAdminNote,
  setNextPaymentDue,
  setProgramFields,
  setRegistrationStatus,
  totalsByRegistration,
  type ProgramEdit,
} from "@/lib/data";
import {
  isEmailConfigured,
  partPaymentDateRequest,
  partPaymentReceipt,
  paymentConfirmation,
  paymentReminder,
  sendEmail,
} from "@/lib/email";
import { EMPTY_FORM_STATE, type FormState } from "@/lib/form-state";
import {
  formatMoney,
  parseAmount,
  settle,
  sumAmounts,
  type Settlement,
} from "@/lib/money";
import {
  isOwing,
  STATUS_ORDER,
  type Payment,
  type Program,
  type Registration,
  type RegistrationStatus,
} from "@/lib/types";

export async function signIn(_prev: string, formData: FormData) {
  const password = String(formData.get("password") ?? "");
  if (!process.env.ADMIN_PASSWORD || !process.env.ADMIN_SESSION_SECRET) {
    return "Admin access is not set up. Add ADMIN_PASSWORD and ADMIN_SESSION_SECRET to your environment.";
  }
  if (!passwordIsCorrect(password)) {
    return "That password does not match.";
  }
  await startSession();
  redirect("/admin");
}

export async function signOut() {
  await endSession();
  redirect("/admin/login");
}

/** A date input posts YYYY-MM-DD, or "" when it is empty. */
const A_DATE = /^\d{4}-\d{2}-\d{2}$/;

export async function updateRegistration(formData: FormData) {
  if (!(await isSignedIn())) redirect("/admin/login");

  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  const note = String(formData.get("admin_note") ?? "");
  if (!id) return;

  if (STATUS_ORDER.includes(status as RegistrationStatus)) {
    const next = status as RegistrationStatus;
    // Read before the write, because whether this is someone arriving at paid
    // or someone already there having their note edited decides whether a
    // transfer gets written down.
    const before = await getRegistrationById(id);
    if (before && next === "confirmed" && before.status !== "confirmed") {
      await settleByHand(before, formData.get("received_on"));
    }
    await setRegistrationStatus(id, next);
  }
  await setAdminNote(id, note);
  revalidatePath("/admin");
}

/**
 * Writes the transfer behind a fee marked paid by hand.
 *
 * Marking someone paid is one press, and the register should not need a second
 * one to learn what came in. The balance is the amount and today is the day,
 * which is the same thing the form would have been filled in with — so the
 * bookkeeping happens here rather than being asked for twice.
 *
 * It is the balance rather than the whole fee, so a row part way through
 * instalments is topped up instead of doubled. Nothing is written when there is
 * nothing left to settle, which is what makes marking someone paid twice
 * harmless, and nothing is written when the program has no fee amount — there
 * is no figure to use, and inventing one is worse than the gap.
 *
 * The note says where the figure came from, so a month later it is not mistaken
 * for one read off a bank message. The day is the one the form asked for, which
 * is today unless whoever pressed Save knew better — a transfer read out of the
 * inbox on Friday may well have landed on Tuesday, and the row that says which
 * is the one you go looking for when a transfer is disputed.
 *
 * A date that did not arrive, or arrived as something other than a date, falls
 * back to today rather than refusing the press: the status is the thing being
 * saved, and losing it over a malformed field nobody can see would be worse
 * than a date that is a few days out.
 */
async function settleByHand(
  registration: Registration,
  receivedOn: FormDataEntryValue | null,
) {
  const [payments, program] = await Promise.all([
    listPaymentsFor(registration.id),
    getProgramById(registration.program_id),
  ]);
  const { outstanding } = settle(
    sumAmounts(payments.map((payment) => payment.amount)),
    program?.fee_amount ?? null,
  );
  if (outstanding === null || outstanding <= 0) return;

  const day = String(receivedOn ?? "").trim();
  await addPayment({
    registration_id: registration.id,
    amount: outstanding,
    received_on: A_DATE.test(day) ? day : new Date().toISOString().slice(0, 10),
    note: "Marked paid in the register",
  });
  // A settled fee expects nothing further, so the arrangement comes off with it.
  await setNextPaymentDue(registration.id, null);
}

/**
 * Puts the status in step with the money on the row: the whole fee has arrived
 * and the place is held, or some of it has and a balance is owed.
 *
 * It only ever moves someone forward. The status is set by hand — that is how a
 * fee sent in one transfer is written down — and money that has arrived is the
 * one fact allowed to overrule it, because keeping the two in step by hand is
 * how a register comes to say someone owes a fee they settled in November.
 *
 * Nothing arrived leaves the status exactly where the hand put it, and that is
 * the case this guard is for. A part paid row is the only one showing an
 * instalment record, so stepping it back to unpaid takes the record off the
 * page: it would have closed on the arrangement agreed before any money was
 * sent, and closed again on the mistyped figure you had just removed in order
 * to type it correctly.
 *
 * Waitlist and withdrawn are left alone outright: those say something about the
 * person, not about their balance, and a refund waiting to go out should not
 * quietly readmit anyone.
 *
 * With no fee amount on the program nobody can be settled, only part paid.
 * That is honest — without a number there is nothing to have met.
 */
async function syncStatusToPayments(registration: Registration) {
  if (
    registration.status === "waitlist" ||
    registration.status === "withdrawn"
  ) {
    return;
  }

  const [payments, program] = await Promise.all([
    listPaymentsFor(registration.id),
    getProgramById(registration.program_id),
  ]);
  const { settled, partial } = settle(
    sumAmounts(payments.map((p) => p.amount)),
    program?.fee_amount ?? null,
  );

  const next: RegistrationStatus | null = settled
    ? "confirmed"
    : partial
      ? "partial"
      : null;
  if (next !== null && next !== registration.status) {
    await setRegistrationStatus(registration.id, next);
    // A settled fee expects nothing further. Cleared here as well as when a fee
    // is marked paid by hand, so a stale date cannot outlive either route.
    if (next === "confirmed") await setNextPaymentDue(registration.id, null);
  }
}

/**
 * What arrived and when the next is expected — the two things you write down
 * after reading the inbox, in one press.
 *
 * The amount may be left empty, and then nothing is recorded and only the
 * date moves: an arrangement can be agreed before any of it is sent, and
 * changed later without inventing a transfer to hang the change on.
 *
 * Recording is the bookkeeping. The status follows from it on its own, and
 * nothing is written to the person — the letter beside their name is a
 * separate press, the same way the confirmation always was.
 */
export async function recordPayment(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  if (!(await isSignedIn())) redirect("/admin/login");

  const id = String(formData.get("id") ?? "");
  if (!id) return EMPTY_FORM_STATE;

  const fieldErrors: Record<string, string> = {};

  const amountText = String(formData.get("amount") ?? "").trim();
  const amount = amountText === "" ? null : parseAmount(amountText);
  if (amountText !== "" && amount === null) {
    fieldErrors.amount = "An amount of money, more than zero.";
  }

  // Empty means today, which is the common case: you are writing it down as
  // you read the inbox, on the day you read it.
  const receivedOn =
    String(formData.get("received_on") ?? "").trim() ||
    new Date().toISOString().slice(0, 10);
  if (!A_DATE.test(receivedOn)) {
    fieldErrors.received_on = "A date, as YYYY-MM-DD.";
  }

  // Absent and empty are not the same thing. The field on the page always
  // posts, empty or not, so an empty one clears the date on purpose; a form
  // that never carried the field at all leaves it alone — which is the same
  // guard the program editor grew after a stale page blanked a column.
  const dueRaw = formData.get("next_payment_due");
  const dueText = dueRaw === null ? undefined : String(dueRaw).trim();
  if (dueText !== undefined && dueText !== "" && !A_DATE.test(dueText)) {
    fieldErrors.next_payment_due = "A date, as YYYY-MM-DD.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { status: "error", message: "Nothing was saved.", fieldErrors };
  }

  const registration = await getRegistrationById(id);
  if (!registration) {
    return {
      ...EMPTY_FORM_STATE,
      status: "error",
      message: "That registration is no longer in the database.",
    };
  }

  if (amount !== null) {
    await addPayment({
      registration_id: id,
      amount,
      received_on: receivedOn,
      note: String(formData.get("payment_note") ?? "").trim() || null,
    });
  }

  if (dueText !== undefined) await setNextPaymentDue(id, dueText || null);
  await syncStatusToPayments(registration);
  revalidatePath("/admin");

  return {
    ...EMPTY_FORM_STATE,
    status: "ok",
    message:
      amount === null
        ? "Saved. Nothing was recorded as received — the amount was empty."
        : `${formatMoney(amount)} recorded.`,
  };
}

/**
 * Takes a payment back off the row — for a figure typed wrong, which is the
 * only reason to. The status is put back in step afterwards, so removing the
 * transfer that settled someone returns them to a balance owed.
 */
export async function removePayment(formData: FormData) {
  if (!(await isSignedIn())) redirect("/admin/login");

  const paymentId = String(formData.get("payment_id") ?? "");
  const id = String(formData.get("id") ?? "");
  if (!paymentId || !id) return;

  await deletePayment(paymentId);

  const registration = await getRegistrationById(id);
  if (registration) await syncStatusToPayments(registration);

  revalidatePath("/admin");
  redirect(`/admin#r-${id}`);
}

/**
 * Tells someone their money arrived and their place is theirs, then records
 * that we did. Nothing here is automatic: it is sent when you have seen the
 * e-transfer land, by pressing the button beside their name.
 *
 * The row is marked only after Resend has accepted the mail, so "sent" in the
 * register never means "we tried". A failure leaves the row untouched and the
 * button ready to press again.
 */
export async function sendPaymentConfirmation(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  if (!(await isSignedIn())) redirect("/admin/login");

  const id = String(formData.get("id") ?? "");
  if (!id) return EMPTY_FORM_STATE;

  if (!isEmailConfigured) {
    return {
      ...EMPTY_FORM_STATE,
      status: "error",
      message: "Email is not set up. Add RESEND_API_KEY to your environment.",
    };
  }

  const registration = await getRegistrationById(id);
  if (!registration) {
    return {
      ...EMPTY_FORM_STATE,
      status: "error",
      message: "That registration is no longer in the database.",
    };
  }

  // The email says their place is held, which is only true once they have
  // paid. Sending it to anyone else would be telling them something untrue.
  if (registration.status !== "confirmed") {
    return {
      ...EMPTY_FORM_STATE,
      status: "error",
      message:
        "Set their status to Paid — place held first. The email tells them their place is reserved, so it should only go out once the transfer has arrived.",
    };
  }

  const program = await getProgramById(registration.program_id);
  if (!program) {
    return {
      ...EMPTY_FORM_STATE,
      status: "error",
      message: "Their program is no longer in the database.",
    };
  }

  try {
    await sendEmail(
      registration.email,
      paymentConfirmation(registration, program),
    );
  } catch (error) {
    return {
      ...EMPTY_FORM_STATE,
      status: "error",
      message: `It was not sent: ${error instanceof Error ? error.message : "the mail server refused it"}. Nothing was recorded, so you can try again.`,
    };
  }

  await markPaymentEmailSent(id);
  revalidatePath("/admin");

  return {
    ...EMPTY_FORM_STATE,
    status: "ok",
    message: `Sent to ${registration.email}.`,
  };
}

/**
 * The nudge, for one person who has registered and not paid. It is the same
 * shape as the confirmation above — press it when you mean to write to them —
 * except that it may be pressed more than once over a term, so the row keeps
 * only the latest time and the button never stops offering another.
 */
export async function sendPaymentReminder(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  if (!(await isSignedIn())) redirect("/admin/login");

  const id = String(formData.get("id") ?? "");
  if (!id) return EMPTY_FORM_STATE;

  if (!isEmailConfigured) {
    return {
      ...EMPTY_FORM_STATE,
      status: "error",
      message: "Email is not set up. Add RESEND_API_KEY to your environment.",
    };
  }

  const registration = await getRegistrationById(id);
  if (!registration) {
    return {
      ...EMPTY_FORM_STATE,
      status: "error",
      message: "That registration is no longer in the database.",
    };
  }

  // The reminder says their place is not held, which stops being true the
  // moment the fee is settled. Waitlisted and withdrawn people are not being
  // asked for money either, so the nudge fits the two states that still owe:
  // registered with nothing in, and part paid with a balance standing.
  if (!isOwing(registration.status)) {
    return {
      ...EMPTY_FORM_STATE,
      status: "error",
      message:
        "The reminder only goes to someone who still owes — Registered — unpaid, or Part paid — balance due. It asks them for money, which is the wrong thing to say to anyone else.",
    };
  }

  const program = await getProgramById(registration.program_id);
  if (!program) {
    return {
      ...EMPTY_FORM_STATE,
      status: "error",
      message: "Their program is no longer in the database.",
    };
  }

  const paid = sumAmounts(
    (await listPaymentsFor(id)).map((payment) => payment.amount),
  );

  try {
    await sendEmail(
      registration.email,
      paymentReminder(registration, program, settle(paid, program.fee_amount)),
    );
  } catch (error) {
    return {
      ...EMPTY_FORM_STATE,
      status: "error",
      message: `It was not sent: ${error instanceof Error ? error.message : "the mail server refused it"}. Nothing was recorded, so you can try again.`,
    };
  }

  await markPaymentReminderSent(id);
  revalidatePath("/admin");

  return {
    ...EMPTY_FORM_STATE,
    status: "ok",
    message: `Sent to ${registration.email}.`,
  };
}

/**
 * Everything the two part-payment letters need, or the reason neither can go.
 *
 * Both say what arrived and name a balance, so both want the same three facts
 * and refuse in the same two cases: nothing has come in, or nothing is left to
 * come. Written once because a third copy of it is how two letters drift into
 * disagreeing about who may be sent one.
 */
async function partPayerFor(id: string): Promise<
  | { ok: false; state: FormState }
  | {
      ok: true;
      registration: Registration;
      program: Program;
      payments: Payment[];
      settlement: Settlement;
    }
> {
  const fail = (message: string) => ({
    ok: false as const,
    state: { ...EMPTY_FORM_STATE, status: "error" as const, message },
  });

  if (!isEmailConfigured) {
    return fail("Email is not set up. Add RESEND_API_KEY to your environment.");
  }

  const registration = await getRegistrationById(id);
  if (!registration) {
    return fail("That registration is no longer in the database.");
  }

  const program = await getProgramById(registration.program_id);
  if (!program) return fail("Their program is no longer in the database.");

  const payments = await listPaymentsFor(id);
  const settlement = settle(
    sumAmounts(payments.map((payment) => payment.amount)),
    program.fee_amount,
  );

  // Both letters name a balance. Both need money to have arrived and a balance
  // to still stand; without either it is the confirmation or the reminder that
  // fits, not these.
  if (!settlement.partial) {
    return fail(
      settlement.settled
        ? "Their fee is settled. Send the payment confirmation instead — these letters name a balance that is no longer owed."
        : "Nothing has arrived from them yet. Record a payment first, or send the reminder instead.",
    );
  }

  return { ok: true, registration, program, payments, settlement };
}

/**
 * The receipt: what arrived, what it leaves, and the agreed date if there is
 * one. It reports rather than asks — pressing it is saying "this is where you
 * stand", which is the letter to send when the arrangement is already settled.
 */
export async function sendPartPaymentReceipt(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  if (!(await isSignedIn())) redirect("/admin/login");

  const id = String(formData.get("id") ?? "");
  if (!id) return EMPTY_FORM_STATE;

  const found = await partPayerFor(id);
  if (!found.ok) return found.state;
  const { registration, program, payments, settlement } = found;

  try {
    await sendEmail(
      registration.email,
      partPaymentReceipt(registration, program, payments, settlement),
    );
  } catch (error) {
    return {
      ...EMPTY_FORM_STATE,
      status: "error",
      message: `It was not sent: ${error instanceof Error ? error.message : "the mail server refused it"}. Nothing was recorded, so you can try again.`,
    };
  }

  await markPartPaymentEmailSent(id);
  revalidatePath("/admin");

  return {
    ...EMPTY_FORM_STATE,
    status: "ok",
    message: `Sent to ${registration.email}.`,
  };
}

/**
 * The same letter ending in a question: which day is the balance coming? It
 * is its own button rather than a condition on the receipt, because a letter
 * nobody can find is a letter that never goes.
 */
export async function sendPartPaymentDateRequest(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  if (!(await isSignedIn())) redirect("/admin/login");

  const id = String(formData.get("id") ?? "");
  if (!id) return EMPTY_FORM_STATE;

  const found = await partPayerFor(id);
  if (!found.ok) return found.state;
  const { registration, program, payments, settlement } = found;

  try {
    await sendEmail(
      registration.email,
      partPaymentDateRequest(registration, program, payments, settlement),
    );
  } catch (error) {
    return {
      ...EMPTY_FORM_STATE,
      status: "error",
      message: `It was not sent: ${error instanceof Error ? error.message : "the mail server refused it"}. Nothing was recorded, so you can try again.`,
    };
  }

  await markDateRequestEmailSent(id);
  revalidatePath("/admin");

  return {
    ...EMPTY_FORM_STATE,
    status: "ok",
    message: `Asked ${registration.email} when the balance is coming.`,
  };
}

/**
 * Resend's free tier accepts two messages a second. A term's worth of unpaid
 * registrations is tens of people, not thousands, so the round is sent one at
 * a time with a gap rather than reaching for a queue.
 */
const SEND_GAP_MS = 600;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * The whole round: a reminder to everyone who still owes, each one written
 * from their own program and their own payments — so a person on last term's
 * course is not sent this term's fee, and someone half way through paying is
 * asked for their balance rather than the whole of it.
 *
 * Every send is marked on its own row as it succeeds, so a round that dies
 * halfway leaves an honest register: pressing it again writes to whoever is
 * still unpaid, and the date beside each name is what tells you who that
 * already reached.
 */
export async function sendPaymentReminders(
  _prev: FormState,
  _formData: FormData,
): Promise<FormState> {
  if (!(await isSignedIn())) redirect("/admin/login");

  if (!isEmailConfigured) {
    return {
      ...EMPTY_FORM_STATE,
      status: "error",
      message: "Email is not set up. Add RESEND_API_KEY to your environment.",
    };
  }

  const registrations = (await listRegistrations()).filter((r) =>
    isOwing(r.status),
  );
  if (registrations.length === 0) {
    return {
      ...EMPTY_FORM_STATE,
      status: "ok",
      message: "Nobody owes anything. Nothing was sent.",
    };
  }

  // One read of the payments table for the whole round, rather than one a
  // person: each letter names what that person has already sent, so every
  // row needs its total and none of them needs a query of its own.
  const paidByRow = totalsByRegistration(await listPayments());
  const programs = new Map<string, Program | null>();
  let sent = 0;
  const failed: string[] = [];

  for (const [index, registration] of registrations.entries()) {
    if (index > 0) await wait(SEND_GAP_MS);

    if (!programs.has(registration.program_id)) {
      programs.set(
        registration.program_id,
        await getProgramById(registration.program_id),
      );
    }
    const program = programs.get(registration.program_id);
    if (!program) {
      failed.push(`${registration.full_name} (their program is gone)`);
      continue;
    }

    try {
      await sendEmail(
        registration.email,
        paymentReminder(
          registration,
          program,
          settle(paidByRow.get(registration.id) ?? 0, program.fee_amount),
        ),
      );
      await markPaymentReminderSent(registration.id);
      sent += 1;
    } catch (error) {
      failed.push(
        `${registration.full_name} (${error instanceof Error ? error.message : "refused"})`,
      );
    }
  }

  revalidatePath("/admin");

  const round = `${sent} reminder${sent === 1 ? "" : "s"} sent`;
  if (failed.length === 0) {
    return { ...EMPTY_FORM_STATE, status: "ok", message: `${round}.` };
  }
  return {
    ...EMPTY_FORM_STATE,
    status: "error",
    message: `${round}. These were not: ${failed.join("; ")}. Their rows are unmarked, so sending the round again reaches them.`,
  };
}

export async function removeRegistration(formData: FormData) {
  if (!(await isSignedIn())) redirect("/admin/login");

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await deleteRegistration(id);
  revalidatePath("/admin");
  redirect("/admin");
}

const PROGRAM_STATUS = ["draft", "open", "closed"] as const;

/**
 * Trimmed text, or undefined when the form did not post the field at all.
 *
 * The two are not the same thing and used to be treated as one. A form
 * rendered before a field existed posts nothing for it, and reading that as
 * an empty string blanked the column on the next save — which is how
 * audience_note was lost within an hour of shipping, by someone saving an
 * admin page their browser had loaded before the deploy. An input that is on
 * the page and left empty still posts "", so clearing a field on purpose
 * works as it always did.
 */
function text(formData: FormData, name: string) {
  const raw = formData.get(name);
  return raw === null ? undefined : String(raw).trim();
}
/** The same, as null rather than "" for the columns that allow one. */
function textOrNull(formData: FormData, name: string) {
  const value = text(formData, name);
  return value === undefined ? undefined : value || null;
}

export async function updateProgram(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  if (!(await isSignedIn())) redirect("/admin/login");

  const id = String(formData.get("id") ?? "");
  const program = id ? await getProgramById(id) : null;
  if (!program) {
    return {
      ...EMPTY_FORM_STATE,
      status: "error",
      message: "That program is no longer in the database.",
    };
  }

  const fieldErrors: Record<string, string> = {};

  // Each of these is only checked when the form actually posted it. A field
  // that is missing is left as it is in the database rather than rejected.
  const title = text(formData, "title");
  if (title === "") fieldErrors.title = "A program needs a title.";

  const capacityText = text(formData, "capacity");
  const capacity =
    capacityText === undefined ? undefined : Number(capacityText);
  if (capacity !== undefined && (!Number.isInteger(capacity) || capacity < 1)) {
    fieldErrors.capacity = "A whole number, 1 or more.";
  }

  // Empty on purpose is a real answer here — a program with no set amount —
  // so "" clears the column rather than failing validation.
  const feeText = text(formData, "fee_amount");
  let fee_amount: number | null | undefined;
  if (feeText !== undefined) {
    if (feeText === "") {
      fee_amount = null;
    } else {
      const parsed = parseAmount(feeText);
      if (parsed === null) {
        fieldErrors.fee_amount = "An amount of money, or empty for none.";
      } else {
        fee_amount = parsed;
      }
    }
  }

  const status = text(formData, "status") as ProgramEdit["status"] | undefined;
  if (status !== undefined && !PROGRAM_STATUS.includes(status)) {
    fieldErrors.status = "Pick a status.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      status: "error",
      message: "Nothing was saved. Look at the fields marked below.",
      fieldErrors,
    };
  }

  await setProgramFields(program.id, {
    title,
    title_ar: textOrNull(formData, "title_ar"),
    tagline: text(formData, "tagline"),
    term: text(formData, "term"),
    lede: textOrNull(formData, "lede"),
    summary: text(formData, "summary"),
    book_note: text(formData, "book_note"),
    format_note: text(formData, "format_note"),
    meeting_note: text(formData, "meeting_note"),
    location: text(formData, "location"),
    audience_note: text(formData, "audience_note"),
    fee_note: text(formData, "fee_note"),
    fee_amount,
    materials_note: text(formData, "materials_note"),
    capacity,
    registration_note: textOrNull(formData, "registration_note"),
    teacher_name: textOrNull(formData, "teacher_name"),
    teacher_bio: textOrNull(formData, "teacher_bio"),
    teacher_photo: textOrNull(formData, "teacher_photo"),
    teacher_url: textOrNull(formData, "teacher_url"),
    status,
  });

  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath(`/programs/${program.slug}`);

  return {
    ...EMPTY_FORM_STATE,
    status: "ok",
    message: "Saved. The site is showing it now.",
  };
}
