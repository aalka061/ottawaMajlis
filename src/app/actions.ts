"use server";

import { createRegistration } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/supabase";
import type { FormState } from "@/lib/form-state";

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function registerInterest(
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
      phone: phone || null,
      heard_from: heardFrom || null,
      note: note || null,
    });
    return {
      status: "ok",
      message:
        result === "duplicate"
          ? "You are already on the list for this program — no need to register twice."
          : "",
      fieldErrors: {},
    };
  } catch {
    return {
      status: "error",
      message:
        "Something went wrong on our side and your registration was not saved. Try again, or email ottawamajless@gmail.com.",
      fieldErrors: {},
    };
  }
}
