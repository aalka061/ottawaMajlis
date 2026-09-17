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
  createQuestion,
  deleteAnswerRecording,
  deletePayment,
  deleteQuestion,
  deleteRegistration,
  getProgramById,
  getQuestionById,
  getRegistrationById,
  listPayments,
  listPaymentsFor,
  listRegistrations,
  markDateRequestEmailSent,
  markPartPaymentEmailSent,
  markPaymentEmailSent,
  markPaymentReminderSent,
  markQuestionNotified,
  setAdminNote,
  setNextPaymentDue,
  setProgramFields,
  setQuestionFields,
  signAnswerUpload,
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
  questionAnswered,
  sendEmail,
} from "@/lib/email";
import { isStoredHere } from "@/lib/audio";
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
  type QuestionStatus,
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

/**
 * What a press of one of the buttons under a question means.
 *
 * `save` keeps the words without deciding anything, which is most presses —
 * an answer written in two sittings, a wording still being worked on. The
 * other four are the decisions, and each is a button of its own rather than a
 * status dropdown: what you are doing is publishing something, not setting a
 * field.
 */
const QUESTION_INTENTS = [
  "save",
  "publish",
  "unpublish",
  "private",
  "reopen",
] as const;

type QuestionIntent = (typeof QUESTION_INTENTS)[number];

/**
 * A question and its answer, saved — and, if a button said so, published,
 * taken down, or closed.
 *
 * Publishing is refused without both halves written. Everything else here can
 * be half done and saved: a question arrives with no answer, and an answer
 * gets written over a few sittings. It is only the page that needs both.
 */
export async function saveQuestion(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  if (!(await isSignedIn())) redirect("/admin/login");

  const id = String(formData.get("id") ?? "");
  if (!id) return EMPTY_FORM_STATE;

  const intentRaw = String(formData.get("intent") ?? "save");
  const intent = (
    QUESTION_INTENTS.includes(intentRaw as QuestionIntent) ? intentRaw : "save"
  ) as QuestionIntent;

  const existing = await getQuestionById(id);
  if (!existing) {
    return {
      ...EMPTY_FORM_STATE,
      status: "error",
      message: "That question is no longer in the database.",
    };
  }

  const question = text(formData, "question") ?? existing.question;
  const answer = text(formData, "answer") ?? existing.answer;
  const sessionNote = textOrNull(formData, "session_note");
  const programRaw = formData.get("program_id");
  const programId =
    programRaw === null ? undefined : String(programRaw).trim() || null;

  const fieldErrors: Record<string, string> = {};
  if (!question) fieldErrors.question = "A question needs its words.";
  if (intent === "publish" && !answer) {
    fieldErrors.answer = "Nothing to publish yet — the answer is empty.";
  }
  if (Object.keys(fieldErrors).length > 0) {
    return {
      status: "error",
      message: "Nothing was saved. Look at the fields marked below.",
      fieldErrors,
    };
  }

  const now = new Date().toISOString();

  // The status the press leaves behind. A plain save decides nothing, except
  // that a question with an answer under it is no longer waiting for one.
  const status: QuestionStatus =
    intent === "publish"
      ? "published"
      : intent === "private"
        ? "closed"
        : intent === "unpublish" || intent === "reopen"
          ? "answered"
          : existing.status === "new" && answer
            ? "answered"
            : existing.status;

  await setQuestionFields(id, {
    question,
    answer,
    session_note: sessionNote,
    program_id: programId,
    status,
    // When it was first answered, kept from the first time an answer existed:
    // the date on the page is when the answer was given, not when its typos
    // were fixed.
    answered_at: answer && !existing.answered_at ? now : undefined,
    // The same for publishing. A question taken down to be reworded and put
    // back keeps its place in the archive rather than jumping to the top as
    // though it were new.
    published_at:
      status === "published" && !existing.published_at ? now : undefined,
  });

  revalidatePath("/admin/questions");
  revalidatePath(`/admin/questions/${id}`);
  revalidatePath("/questions");

  return {
    ...EMPTY_FORM_STATE,
    status: "ok",
    message:
      intent === "publish"
        ? "Published. It is on the questions page now."
        : intent === "unpublish"
          ? "Taken off the site. The answer is kept here."
          : intent === "private"
            ? "Closed. It stays here and never goes up."
            : intent === "reopen"
              ? "Open again, and not on the site."
              : "Saved.",
  };
}

/**
 * A question entered here rather than asked through the form: one asked out
 * loud after a session, one that came in by email from someone not on the
 * register, or one nobody asked and everybody wonders.
 *
 * It has no asker, which is the whole difference. Nothing is owed to anyone
 * when it is published, so there is nobody to tell, and the wording is already
 * the public wording because whoever typed it wrote it that way.
 */
export async function addQuestion(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  if (!(await isSignedIn())) redirect("/admin/login");

  const question = text(formData, "question") ?? "";
  const answer = text(formData, "answer") ?? "";
  const publish = String(formData.get("intent") ?? "") === "publish";

  const fieldErrors: Record<string, string> = {};
  if (!question) fieldErrors.question = "A question needs its words.";
  if (publish && !answer) {
    fieldErrors.answer = "Nothing to publish yet — the answer is empty.";
  }
  if (Object.keys(fieldErrors).length > 0) {
    return {
      status: "error",
      message: "Nothing was saved. Look at the fields marked below.",
      fieldErrors,
    };
  }

  const created = await createQuestion({
    asker_email: null,
    asker_name: null,
    program_id: textOrNull(formData, "program_id") ?? null,
    session_note: textOrNull(formData, "session_note") ?? null,
    // Typed here, so what was asked and what the page shows are the same
    // words. They can still part company later, in the editor.
    asked: question,
    question,
    notify: false,
  });

  const now = new Date().toISOString();
  if (answer) {
    await setQuestionFields(created.id, {
      answer,
      status: publish ? "published" : "answered",
      answered_at: now,
      published_at: publish ? now : undefined,
    });
  }

  revalidatePath("/admin/questions");
  revalidatePath("/questions");

  return {
    ...EMPTY_FORM_STATE,
    status: "ok",
    message: publish
      ? "Published. It is on the questions page now."
      : answer
        ? "Added, with its answer. Publish it when you are ready."
        : "Added. It is waiting for an answer.",
  };
}

/**
 * Erases a question. For one that should never have been a row — a test, or
 * something posted twice. A question answered but not for the page is closed
 * instead, which keeps it.
 */
export async function removeQuestion(formData: FormData) {
  if (!(await isSignedIn())) redirect("/admin/login");

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await deleteQuestion(id);
  revalidatePath("/admin/questions");
  revalidatePath("/questions");
  redirect("/admin/questions");
}

/**
 * Tells someone their question has been answered, and records that we did.
 *
 * Only ever a press of a button, like every other letter here — the checkbox
 * on the form records that they would like to hear, and nothing more than
 * that. The letter carries the answer itself, so it is worth reading even by
 * someone who never opens the page.
 *
 * It refuses while the question is still being worked on. "Answered" is a
 * state for a draft and a wording still being argued with, and a letter sent
 * out of it would carry words that are about to change.
 */
export async function sendAnswerNotice(
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

  const question = await getQuestionById(id);
  if (!question) {
    return {
      ...EMPTY_FORM_STATE,
      status: "error",
      message: "That question is no longer in the database.",
    };
  }

  if (!question.asker_email) {
    return {
      ...EMPTY_FORM_STATE,
      status: "error",
      message:
        "Nobody asked this one — it was written here, so there is nobody to write to.",
    };
  }

  if (question.status !== "published" && question.status !== "closed") {
    return {
      ...EMPTY_FORM_STATE,
      status: "error",
      message:
        "Publish it first, or close it as answered privately. While it is still being written the answer can still change.",
    };
  }

  const letter = questionAnswered(question);
  if (!letter) {
    return {
      ...EMPTY_FORM_STATE,
      status: "error",
      message: "There is no answer to send yet.",
    };
  }

  try {
    await sendEmail(question.asker_email, letter);
  } catch (error) {
    return {
      ...EMPTY_FORM_STATE,
      status: "error",
      message: `It was not sent: ${error instanceof Error ? error.message : "the mail server refused it"}. Nothing was recorded, so you can try again.`,
    };
  }

  await markQuestionNotified(id);
  revalidatePath("/admin/questions");
  revalidatePath(`/admin/questions/${id}`);

  return {
    ...EMPTY_FORM_STATE,
    status: "ok",
    message: `Sent to ${question.asker_email}.`,
  };
}

/**
 * Somewhere for the browser to put a recording.
 *
 * Called from the page itself rather than from a form, because what comes
 * back is an address rather than a rendered answer. The signing happens here
 * and not in the browser: it is the service key that mints these, and the
 * service key never leaves the server.
 */
export async function startAnswerUpload(questionId: string) {
  if (!(await isSignedIn())) redirect("/admin/login");

  const question = await getQuestionById(questionId);
  if (!question) {
    return { error: "That question is no longer in the database." } as const;
  }

  try {
    return await signAnswerUpload(questionId);
  } catch (error) {
    return {
      error: `The upload could not be started: ${error instanceof Error ? error.message : "storage refused it"}.`,
    } as const;
  }
}

/**
 * Keeps the recording that was just uploaded, and throws away the one it
 * replaces.
 *
 * The path comes back from the browser, so it is checked rather than trusted:
 * a signed URL was minted for this question's own folder, and anything else
 * is somebody else's file.
 */
export async function keepAnswerRecording(questionId: string, path: string) {
  if (!(await isSignedIn())) redirect("/admin/login");

  if (!path.startsWith(`${questionId}/`)) {
    return { error: "That recording does not belong to this question." };
  }

  const question = await getQuestionById(questionId);
  if (!question) {
    return { error: "That question is no longer in the database." };
  }

  await setQuestionFields(questionId, { answer_audio: path });

  // The one it replaced, if we were the ones keeping it. A link to somewhere
  // else is not ours to delete.
  const old = question.answer_audio;
  if (isStoredHere(old) && old !== path) {
    try {
      await deleteAnswerRecording(old);
    } catch {
      // A file left behind is a file left behind. The question now points at
      // the new one, which is the part that matters.
    }
  }

  revalidatePath("/admin/questions");
  revalidatePath(`/admin/questions/${questionId}`);
  revalidatePath("/questions");

  return { ok: true };
}

/**
 * A recording that already lives somewhere else, by its address.
 *
 * It has to be a link to the file itself. A Google Drive or Dropbox share page
 * is a page, not a recording, and a player pointed at one plays nothing —
 * which is why what is not playable is offered as a plain link instead.
 */
export async function setAnswerAudioLink(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  if (!(await isSignedIn())) redirect("/admin/login");

  const id = String(formData.get("id") ?? "");
  if (!id) return EMPTY_FORM_STATE;

  const link = text(formData, "answer_audio") ?? "";
  if (link && !/^https?:\/\//i.test(link)) {
    return {
      status: "error",
      message: "",
      fieldErrors: {
        answer_audio: "A web address, starting http:// or https://.",
      },
    };
  }

  const question = await getQuestionById(id);
  if (!question) {
    return {
      ...EMPTY_FORM_STATE,
      status: "error",
      message: "That question is no longer in the database.",
    };
  }

  await setQuestionFields(id, { answer_audio: link || null });

  const old = question.answer_audio;
  if (isStoredHere(old) && old !== link) {
    try {
      await deleteAnswerRecording(old);
    } catch {
      // As above: the question points where it should, which is the point.
    }
  }

  revalidatePath("/admin/questions");
  revalidatePath(`/admin/questions/${id}`);
  revalidatePath("/questions");

  return {
    ...EMPTY_FORM_STATE,
    status: "ok",
    message: link ? "Linked." : "The recording is off the answer.",
  };
}

/** Takes the recording off an answer, and out of the bucket if it was ours. */
export async function clearAnswerAudio(formData: FormData) {
  if (!(await isSignedIn())) redirect("/admin/login");

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const question = await getQuestionById(id);
  if (!question) return;

  await setQuestionFields(id, { answer_audio: null });
  if (isStoredHere(question.answer_audio)) {
    try {
      await deleteAnswerRecording(question.answer_audio);
    } catch {
      // Nothing points at it any more; a file left in the bucket is tidier to
      // lose than a page pointing at one that is gone.
    }
  }

  revalidatePath("/admin/questions");
  revalidatePath(`/admin/questions/${id}`);
  revalidatePath("/questions");
  redirect(`/admin/questions/${id}`);
}
