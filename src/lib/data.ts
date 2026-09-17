import "server-only";
import { isSupabaseConfigured, supabase } from "./supabase";
import { SEED_PROGRAMS } from "./seed";
import { ANSWER_BUCKET } from "./audio";
import { sumAmounts } from "./money";
import type {
  Payment,
  Program,
  Question,
  Registration,
  RegistrationStatus,
} from "./types";

export async function getPrograms(): Promise<Program[]> {
  if (!isSupabaseConfigured) {
    return SEED_PROGRAMS.filter((p) => p.status !== "draft");
  }
  const { data, error } = await supabase()
    .from("programs")
    .select("*")
    .neq("status", "draft")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Program[];
}

export async function getProgram(slug: string): Promise<Program | null> {
  if (!isSupabaseConfigured) {
    return SEED_PROGRAMS.find((p) => p.slug === slug) ?? null;
  }
  const { data, error } = await supabase()
    .from("programs")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Program) ?? null;
}

/**
 * The one program the site is about: whatever is open, and if nothing is,
 * the most recent one so its closing note is still readable.
 */
export async function getFeaturedProgram(): Promise<Program | null> {
  const programs = await getPrograms();
  return programs.find((p) => p.status === "open") ?? programs[0] ?? null;
}

/** Every program, drafts included. For the admin register only. */
export async function listPrograms(): Promise<Program[]> {
  if (!isSupabaseConfigured) return SEED_PROGRAMS;
  const { data, error } = await supabase()
    .from("programs")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Program[];
}

export async function getProgramById(id: string): Promise<Program | null> {
  if (!isSupabaseConfigured) {
    return SEED_PROGRAMS.find((p) => p.id === id) ?? null;
  }
  const { data, error } = await supabase()
    .from("programs")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Program) ?? null;
}

/**
 * The fields the register can edit. The slug is left out on purpose — it is
 * the address of the page — and so are the two list fields (credentials and
 * explore), which are edited in Supabase.
 */
export type ProgramEdit = Pick<
  Program,
  | "title"
  | "title_ar"
  | "tagline"
  | "term"
  | "lede"
  | "summary"
  | "book_note"
  | "format_note"
  | "meeting_note"
  | "location"
  | "audience_note"
  | "fee_note"
  | "fee_amount"
  | "materials_note"
  | "capacity"
  | "registration_note"
  | "teacher_name"
  | "teacher_bio"
  | "teacher_photo"
  | "teacher_url"
  | "status"
>;

/**
 * Writes only the fields the caller actually passed. A field left undefined is
 * not touched, so a form that never posted one cannot blank the column behind
 * the editor's back.
 */
export async function setProgramFields(
  id: string,
  fields: Partial<ProgramEdit>,
) {
  const present = Object.fromEntries(
    Object.entries(fields).filter(([, value]) => value !== undefined),
  );
  if (Object.keys(present).length === 0) return;
  const { error } = await supabase()
    .from("programs")
    .update(present)
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export type NewRegistration = {
  program_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  heard_from: string | null;
  note: string | null;
};

/** Returns "created" or "duplicate" — the same email twice is not an error. */
export async function createRegistration(
  input: NewRegistration,
): Promise<"created" | "duplicate"> {
  const { error } = await supabase().from("registrations").insert(input);
  if (error) {
    if (error.code === "23505") return "duplicate";
    throw new Error(error.message);
  }
  return "created";
}

export async function listRegistrations(): Promise<Registration[]> {
  const { data, error } = await supabase()
    .from("registrations")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Registration[];
}

export async function setRegistrationStatus(
  id: string,
  status: RegistrationStatus,
) {
  const { error } = await supabase()
    .from("registrations")
    .update({ status })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

/**
 * The day the next instalment is expected, or null to clear it. Written on
 * its own so that saving a date does not disturb the status the payments set.
 */
export async function setNextPaymentDue(id: string, due: string | null) {
  const { error } = await supabase()
    .from("registrations")
    .update({ next_payment_due: due })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

/** One row, for the actions that work on a single person. */
export async function getRegistrationById(
  id: string,
): Promise<Registration | null> {
  const { data, error } = await supabase()
    .from("registrations")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Registration) ?? null;
}

/**
 * Records that the payment confirmation went out, now. Called only after the
 * send itself has succeeded, so a row that says it was sent means it was.
 */
export async function markPaymentEmailSent(id: string) {
  const { error } = await supabase()
    .from("registrations")
    .update({ payment_email_sent_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

/**
 * Records that a payment reminder went out, now. Called only after the send
 * itself has succeeded. Re-sending overwrites the time: what you want to know
 * before nudging someone again is when the last one was, not how many.
 */
export async function markPaymentReminderSent(id: string) {
  const { error } = await supabase()
    .from("registrations")
    .update({ payment_reminder_sent_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

/**
 * Records that a part-payment receipt went out, now. Called only after the
 * send itself has succeeded. One may go per instalment, so re-sending
 * overwrites the time rather than keeping a history.
 */
export async function markPartPaymentEmailSent(id: string) {
  const { error } = await supabase()
    .from("registrations")
    .update({ part_payment_email_sent_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

/** The same, for the letter asking which day the balance is coming. */
export async function markDateRequestEmailSent(id: string) {
  const { error } = await supabase()
    .from("registrations")
    .update({ date_request_email_sent_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function setAdminNote(id: string, admin_note: string) {
  const { error } = await supabase()
    .from("registrations")
    .update({ admin_note: admin_note || null })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteRegistration(id: string) {
  const { error } = await supabase()
    .from("registrations")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
}

/**
 * Every payment on the register, oldest transfer first within a person. The
 * whole table is read at once and grouped in memory: a term is tens of people
 * with two or three transfers each, so one query beats a query a row.
 */
export async function listPayments(): Promise<Payment[]> {
  const { data, error } = await supabase()
    .from("payments")
    .select("*")
    .order("received_on", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map(asPayment);
}

/** The transfers on one person, for the actions that work on a single row. */
export async function listPaymentsFor(
  registrationId: string,
): Promise<Payment[]> {
  const { data, error } = await supabase()
    .from("payments")
    .select("*")
    .eq("registration_id", registrationId)
    .order("received_on", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map(asPayment);
}

/**
 * A numeric column can come back over the wire as a string, depending on how
 * the driver of the day feels about precision. Everything downstream adds
 * these up, so they are made numbers once, here, rather than at each sum.
 */
function asPayment(row: Record<string, unknown>): Payment {
  return { ...row, amount: Number(row.amount) } as Payment;
}

export type NewPayment = {
  registration_id: string;
  amount: number;
  received_on: string;
  note: string | null;
};

export async function addPayment(input: NewPayment): Promise<Payment> {
  const { data, error } = await supabase()
    .from("payments")
    .insert(input)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return asPayment(data as Record<string, unknown>);
}

export async function deletePayment(id: string) {
  const { error } = await supabase().from("payments").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/** What has arrived on each registration, keyed by its id. */
export function totalsByRegistration(payments: Payment[]): Map<string, number> {
  const byRow = new Map<string, number[]>();
  for (const p of payments) {
    const amounts = byRow.get(p.registration_id) ?? [];
    amounts.push(p.amount);
    byRow.set(p.registration_id, amounts);
  }
  return new Map([...byRow].map(([id, amounts]) => [id, sumAmounts(amounts)]));
}

/**
 * The questions on the site: answered, published, newest first.
 *
 * Without a database this is empty rather than seeded. The programs have seed
 * rows so the site can be read before Supabase is connected; questions are
 * what people actually asked, and inventing a few would put words in their
 * mouths on a public page.
 */
export async function listPublishedQuestions(): Promise<Question[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase()
    .from("questions")
    .select("*")
    .eq("status", "published")
    .order("published_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Question[];
}

/** Every question, answered or not, newest first. For the register only. */
export async function listQuestions(): Promise<Question[]> {
  const { data, error } = await supabase()
    .from("questions")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Question[];
}

export async function getQuestionById(id: string): Promise<Question | null> {
  const { data, error } = await supabase()
    .from("questions")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Question) ?? null;
}

export type NewQuestion = {
  asker_email: string | null;
  asker_name: string | null;
  program_id: string | null;
  session_note: string | null;
  asked: string;
  /**
   * What the page will show. The form leaves it as a copy of `asked` for
   * editing before it is published; a question entered in the register is
   * already in its public wording and writes the same text into both.
   */
  question: string;
  notify: boolean;
};

export async function createQuestion(input: NewQuestion): Promise<Question> {
  const { data, error } = await supabase()
    .from("questions")
    .insert(input)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Question;
}

/** The fields the register can write. Who asked and when are not among them. */
export type QuestionEdit = Pick<
  Question,
  | "program_id"
  | "session_note"
  | "question"
  | "answer"
  | "answer_audio"
  | "answer_audio_seconds"
  | "status"
  | "answered_at"
  | "published_at"
>;

/**
 * Writes only the fields the caller passed, like `setProgramFields`: a field
 * left undefined is not touched, so a form that never posted one cannot blank
 * the column behind the editor's back. Null is a value here and does clear —
 * that is how a question is taken off the site.
 */
export async function setQuestionFields(
  id: string,
  fields: Partial<QuestionEdit>,
) {
  const present = Object.fromEntries(
    Object.entries(fields).filter(([, value]) => value !== undefined),
  );
  if (Object.keys(present).length === 0) return;
  const { error } = await supabase()
    .from("questions")
    .update(present)
    .eq("id", id);
  if (error) throw new Error(error.message);
}

/**
 * Records that we told them their question is answered, now. Called only
 * after the send itself has succeeded, like every other letter here.
 */
export async function markQuestionNotified(id: string) {
  const { error } = await supabase()
    .from("questions")
    .update({ notified_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteQuestion(id: string) {
  const { error } = await supabase().from("questions").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/**
 * Every registration on one email address, newest first.
 *
 * This is what the Q&A form checks: asking is open to people on the register,
 * and the address they registered with is the whole of the check. Matched on
 * the lowercased address, which is how the site stores it and what the unique
 * index on the table is built from.
 *
 * Deliberately `eq` rather than `ilike`: in a filter, a `%` in what someone
 * typed is a wildcard, and `%@%` would match the first registration in the
 * table and hand them somebody else's name.
 */
export async function findRegistrationsByEmail(
  email: string,
): Promise<Registration[]> {
  const { data, error } = await supabase()
    .from("registrations")
    .select("*")
    .eq("email", email.trim().toLowerCase())
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Registration[];
}

/**
 * How many questions this address has asked since a given moment. The form
 * uses it to cap a day's asking: the register is a short list of people, but
 * a form is a form, and one person having a bad night should not be able to
 * bury the term's questions under a hundred of their own.
 */
export async function countQuestionsFrom(
  email: string,
  since: Date,
): Promise<number> {
  const { count, error } = await supabase()
    .from("questions")
    .select("id", { count: "exact", head: true })
    .eq("asker_email", email.trim().toLowerCase())
    .gte("created_at", since.toISOString());
  if (error) throw new Error(error.message);
  return count ?? 0;
}

/**
 * A one-time URL the browser can upload a recording to, and the path it will
 * land at.
 *
 * The file never travels through this server. A server action carries a small
 * body by default, an answer is megabytes, and passing it through would mean
 * holding the whole thing in memory on the way past for no reason: the browser
 * has the file, Supabase can take it, and all this has to do is say where.
 *
 * A new name every time, under the question's own folder. A recording replaced
 * while someone is listening should not be served from a cache still holding
 * the old one, and the folder is what lets a delete be sure whose file it is.
 */
export async function signAnswerUpload(
  questionId: string,
): Promise<{ path: string; url: string }> {
  const path = `${questionId}/${Date.now()}.mp3`;
  const { data, error } = await supabase()
    .storage.from(ANSWER_BUCKET)
    .createSignedUploadUrl(path);
  if (error) throw new Error(error.message);
  return { path, url: data.signedUrl };
}

/** Takes a recording out of the bucket. Only ever one of our own paths. */
export async function deleteAnswerRecording(path: string) {
  const { error } = await supabase().storage.from(ANSWER_BUCKET).remove([path]);
  if (error) throw new Error(error.message);
}
