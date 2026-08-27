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
  deleteRegistration,
  getProgramById,
  setAdminNote,
  setProgramFields,
  setRegistrationStatus,
  type ProgramEdit,
} from "@/lib/data";
import { EMPTY_FORM_STATE, type FormState } from "@/lib/form-state";
import { STATUS_ORDER, type RegistrationStatus } from "@/lib/types";

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

export async function updateRegistration(formData: FormData) {
  if (!(await isSignedIn())) redirect("/admin/login");

  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  const note = String(formData.get("admin_note") ?? "");
  if (!id) return;

  if (STATUS_ORDER.includes(status as RegistrationStatus)) {
    await setRegistrationStatus(id, status as RegistrationStatus);
  }
  await setAdminNote(id, note);
  revalidatePath("/admin");
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
  const capacity = capacityText === undefined ? undefined : Number(capacityText);
  if (
    capacity !== undefined &&
    (!Number.isInteger(capacity) || capacity < 1)
  ) {
    fieldErrors.capacity = "A whole number, 1 or more.";
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
