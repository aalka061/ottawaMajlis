import "server-only";
import { isSupabaseConfigured, supabase } from "./supabase";
import { SEED_PROGRAMS } from "./seed";
import type { Program, Registration, RegistrationStatus } from "./types";

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
  const { error } = await supabase().from("programs").update(present).eq("id", id);
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

export async function setAdminNote(id: string, admin_note: string) {
  const { error } = await supabase()
    .from("registrations")
    .update({ admin_note: admin_note || null })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteRegistration(id: string) {
  const { error } = await supabase().from("registrations").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
