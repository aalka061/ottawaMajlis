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
