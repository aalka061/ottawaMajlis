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
  setAdminNote,
  setRegistrationStatus,
} from "@/lib/data";
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
