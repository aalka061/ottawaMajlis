"use server";

import { revalidatePath } from "next/cache";
import {
  countQuestionsFrom,
  createQuestion,
  createRegistration,
  findRegistrationsByEmail,
  getSettings,
} from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/supabase";
import type { FormState } from "@/lib/form-state";
import { isValidPhone } from "@/lib/phone";
import { CONTACT_EMAIL } from "@/lib/site";

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function register(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  // Bots fill every field they find; people never see this one.
  if (text(formData, "company")) {
    return { status: "ok", message: "Thank you.", fieldErrors: {} };
  }

  const programId = text(formData, "program_id");
  const fullName = text(formData, "full_name");
  const email = text(formData, "email");
  const phone = text(formData, "phone");
  const heardFrom = text(formData, "heard_from");
  const note = text(formData, "note");

  const fieldErrors: Record<string, string> = {};
  if (!fullName) fieldErrors.full_name = "Tell us your name.";
  if (!email) {
    fieldErrors.email = "We need an email to reach you.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    fieldErrors.email = "That email address looks incomplete.";
  }
  if (!phone) {
    fieldErrors.phone = "We need a WhatsApp number to reach you.";
  } else if (!isValidPhone(phone)) {
    fieldErrors.phone =
      "That number looks incomplete. Ten digits for Canada, or start with + and your country code.";
  }
  if (Object.keys(fieldErrors).length > 0) {
    return { status: "error", message: "", fieldErrors };
  }

  if (!isSupabaseConfigured) {
    return {
      status: "error",
      message:
        "Registration is not connected yet. Add the Supabase keys to .env.local and reload.",
      fieldErrors: {},
    };
  }

  try {
    const result = await createRegistration({
      program_id: programId,
      full_name: fullName,
      email: email.toLowerCase(),
      phone,
      heard_from: heardFrom || null,
      note: note || null,
    });
    return {
      status: "ok",
      message:
        result === "duplicate"
          ? "You are already registered for this program — no need to do it twice. If the e-transfer has not gone out yet, that is the step that holds your place."
          : "",
      fieldErrors: {},
    };
  } catch {
    return {
      status: "error",
      message: `Something went wrong on our side and your registration was not saved. Try again, or email ${CONTACT_EMAIL}.`,
      fieldErrors: {},
    };
  }
}

/** The most a question can run to. Past this it is a letter, not a question. */
const LONGEST_QUESTION = 2000;

/** A day's asking, per address. Enough for anyone with a real question. */
const A_DAY_OF_QUESTIONS = 5;

/**
 * A question, asked by someone on the register.
 *
 * Asking is checked against the email they registered with, and that is the
 * whole of the gate: no accounts, no password, no link to click. It is not
 * proof of who they are — a classmate's address would pass — and it does not
 * need to be. Nothing reaches the site on its own: the question waits in the
 * register until it is answered and published, it is published without a
 * name, and whoever publishes it has read it first.
 *
 * What it does buy is the thing an open form on a public page cannot have,
 * which is a wall against the hundred machines that fill in every form they
 * find. Someone not on the register is told where to write instead; their
 * question can still end up on the page, entered by hand.
 */
export async function askQuestion(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  // Bots fill every field they find; people never see this one.
  if (text(formData, "company")) {
    return { status: "ok", message: "Thank you.", fieldErrors: {} };
  }

  /**
   * Asked before anything is looked at. When the form is closed the page does
   * not render it at all, so reaching here means a stale tab or a posted
   * request, and neither is owed a list of field errors first: the answer is
   * the same whatever they typed.
   */
  if (!(await getSettings()).questions_open) {
    return {
      status: "error",
      message: `Questions are closed just now — the page is still there to read, and asking opens again with the next term. Anything that will not keep can go to ${CONTACT_EMAIL}.`,
      fieldErrors: {},
    };
  }

  const email = text(formData, "email").toLowerCase();
  const question = text(formData, "question");
  const sessionNote = text(formData, "session_note");
  const notify = formData.get("notify") !== null;

  const fieldErrors: Record<string, string> = {};
  if (!email) {
    fieldErrors.email = "The email you registered with.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    fieldErrors.email = "That email address looks incomplete.";
  }
  if (!question) {
    fieldErrors.question = "Write the question itself.";
  } else if (question.length > LONGEST_QUESTION) {
    fieldErrors.question = `That is longer than this form takes. Keep it under ${LONGEST_QUESTION} characters, or write to ${CONTACT_EMAIL}.`;
  }
  if (Object.keys(fieldErrors).length > 0) {
    return { status: "error", message: "", fieldErrors };
  }

  if (!isSupabaseConfigured) {
    return {
      status: "error",
      message: `Questions are not connected yet. Write to ${CONTACT_EMAIL} in the meantime.`,
      fieldErrors: {},
    };
  }

  try {
    // Everyone on the register but the withdrawn. Unpaid and waitlisted people
    // ask the most questions of anyone — they are the ones still deciding.
    const registrations = (await findRegistrationsByEmail(email)).filter(
      (r) => r.status !== "withdrawn",
    );
    if (registrations.length === 0) {
      return {
        status: "error",
        message: `We cannot find ${email} on the register. Use the address you registered with — or, if you have not registered, write to ${CONTACT_EMAIL} and your question can still be answered here.`,
        fieldErrors: {},
      };
    }

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    if ((await countQuestionsFrom(email, since)) >= A_DAY_OF_QUESTIONS) {
      return {
        status: "error",
        message: `That is ${A_DAY_OF_QUESTIONS} questions from this address today, which is as many as this form takes in a day. Anything else can go to ${CONTACT_EMAIL}.`,
        fieldErrors: {},
      };
    }

    // Their most recent registration names them and their program. Someone
    // who has sat more than one term has more than one; the latest is the one
    // they are asking from, and the register can move the question if not.
    const [latest] = registrations;

    await createQuestion({
      asker_email: email,
      asker_name: latest.full_name,
      program_id: latest.program_id,
      session_note: sessionNote.slice(0, 120) || null,
      asked: question,
      // What the page would show, before anyone has edited it. The two part
      // company in the register, where the question is put into its general
      // form before it goes up.
      question,
      notify,
    });

    revalidatePath("/admin/questions");

    return { status: "ok", message: "", fieldErrors: {} };
  } catch {
    return {
      status: "error",
      message: `Something went wrong on our side and your question was not saved. Try again, or send it to ${CONTACT_EMAIL}.`,
      fieldErrors: {},
    };
  }
}
