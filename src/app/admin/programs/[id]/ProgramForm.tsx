"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { updateProgram } from "../../actions";
import { EMPTY_FORM_STATE } from "@/lib/form-state";
import type { Program } from "@/lib/types";

const PROGRAM_STATUS_LABEL: Record<Program["status"], string> = {
  draft: "Draft — not on the site at all",
  open: "Open — listed, and taking registrations",
  closed: "Closed — on the site, not taking registrations",
};

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn" disabled={pending}>
      {pending ? "Saving…" : "Save the program"}
    </button>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1.5 text-sm text-madder">{message}</p>;
}

function Field({
  name,
  label,
  hint,
  error,
  children,
}: {
  name: string;
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="field-label" htmlFor={name}>
        {label}
      </label>
      {hint ? <p className="mt-1 text-sm text-slate">{hint}</p> : null}
      <div className="mt-2">{children}</div>
      <FieldError message={error} />
    </div>
  );
}

export function ProgramForm({ program }: { program: Program }) {
  const [state, action] = useActionState(updateProgram, EMPTY_FORM_STATE);
  const err = state.fieldErrors;

  return (
    <form action={action}>
      <input type="hidden" name="id" value={program.id} />

      <section className="grid gap-6">
        <p className="rubric">What visitors read first</p>
        <Field name="title" label="Title" error={err.title}>
          <input
            id="title"
            name="title"
            defaultValue={program.title}
            className="field-input"
            required
          />
        </Field>
        <Field
          name="title_ar"
          label="Title in Arabic"
          hint="Optional. Set beside the title in brass."
        >
          <input
            id="title_ar"
            name="title_ar"
            lang="ar"
            dir="rtl"
            defaultValue={program.title_ar ?? ""}
            className="field-input"
          />
        </Field>
        <Field name="tagline" label="Tagline">
          <input
            id="tagline"
            name="tagline"
            defaultValue={program.tagline}
            className="field-input"
          />
        </Field>
        <Field name="term" label="Term" hint="e.g. Starts mid-September 2026">
          <input
            id="term"
            name="term"
            defaultValue={program.term}
            className="field-input"
          />
        </Field>
        <Field
          name="lede"
          label="Lede"
          hint="The question the page opens with, set large above the summary."
        >
          <textarea
            id="lede"
            name="lede"
            rows={3}
            defaultValue={program.lede ?? ""}
            className="field-input"
          />
        </Field>
        <Field name="summary" label="Summary">
          <textarea
            id="summary"
            name="summary"
            rows={7}
            defaultValue={program.summary}
            className="field-input"
          />
        </Field>
      </section>

      <section className="mt-12 grid gap-6 border-t border-line pt-10">
        <p className="rubric">The details strip</p>
        <Field
          name="book_note"
          label="Book"
          hint="The text being read. First row of the details."
        >
          <input
            id="book_note"
            name="book_note"
            defaultValue={program.book_note ?? ""}
            className="field-input"
          />
        </Field>
        <Field
          name="format_note"
          label="Format"
          hint="e.g. 2 months · 16 sessions · 1.5 hours each"
        >
          <input
            id="format_note"
            name="format_note"
            defaultValue={program.format_note}
            className="field-input"
          />
        </Field>
        <Field name="meeting_note" label="When">
          <input
            id="meeting_note"
            name="meeting_note"
            defaultValue={program.meeting_note}
            className="field-input"
          />
        </Field>
        <Field name="location" label="Where">
          <input
            id="location"
            name="location"
            defaultValue={program.location}
            className="field-input"
          />
        </Field>
        <Field
          name="fee_note"
          label="Fee"
          hint='The amount only, e.g. $150 for the whole course (2 months). The page supplies "by Interac e-transfer to…" around it, so leave the method out.'
        >
          <input
            id="fee_note"
            name="fee_note"
            defaultValue={program.fee_note}
            className="field-input"
          />
        </Field>
        <Field
          name="registration_note"
          label="Note when registration is closed"
          hint="Optional. Replaces the form once the status is Closed — say when the next cohort opens."
        >
          <textarea
            id="registration_note"
            name="registration_note"
            rows={3}
            defaultValue={program.registration_note ?? ""}
            className="field-input"
          />
        </Field>
      </section>

      <section className="mt-12 grid gap-6 border-t border-line pt-10">
        <p className="rubric">Who teaches it</p>
        <Field name="teacher_name" label="Name">
          <input
            id="teacher_name"
            name="teacher_name"
            defaultValue={program.teacher_name ?? ""}
            className="field-input"
          />
        </Field>
        <Field name="teacher_bio" label="Bio">
          <textarea
            id="teacher_bio"
            name="teacher_bio"
            rows={5}
            defaultValue={program.teacher_bio ?? ""}
            className="field-input"
          />
        </Field>
        <Field
          name="teacher_url"
          label="Their website"
          hint="Linked from their name on the page. Leave empty for no link."
        >
          <input
            id="teacher_url"
            name="teacher_url"
            type="url"
            placeholder="https://example.com"
            defaultValue={program.teacher_url ?? ""}
            className="field-input"
          />
        </Field>
        <Field
          name="teacher_photo"
          label="Photo"
          hint="A path in /public, e.g. /shaykh-zakaria.webp"
        >
          <input
            id="teacher_photo"
            name="teacher_photo"
            defaultValue={program.teacher_photo ?? ""}
            className="field-input"
          />
        </Field>
      </section>

      <section className="mt-12 grid gap-6 border-t border-line pt-10">
        <p className="rubric">Kept off the site</p>
        <Field
          name="capacity"
          label="Internal target"
          hint="How many you are aiming to seat. Never shown to visitors and never a cap — registration stays open past it. It only draws the ring."
          error={err.capacity}
        >
          <input
            id="capacity"
            name="capacity"
            type="number"
            min={1}
            step={1}
            defaultValue={program.capacity}
            className="field-input"
          />
        </Field>
        <Field name="status" label="Status" error={err.status}>
          <select
            id="status"
            name="status"
            defaultValue={program.status}
            className="field-input"
          >
            {(Object.keys(PROGRAM_STATUS_LABEL) as Program["status"][]).map(
              (status) => (
                <option key={status} value={status}>
                  {PROGRAM_STATUS_LABEL[status]}
                </option>
              ),
            )}
          </select>
        </Field>
      </section>

      {state.message ? (
        <p
          className={`mt-8 border-l-2 pl-3 text-sm ${
            state.status === "ok"
              ? "border-brass text-slate"
              : "border-madder text-madder"
          }`}
          role="status"
        >
          {state.message}
        </p>
      ) : null}

      <div className="mt-8 flex flex-wrap items-center gap-5">
        <SaveButton />
        <p className="font-mono text-xs text-slate">
          The sessions, the four cards, and the teacher’s credentials are lists
          — edit those in Supabase.
        </p>
      </div>
    </form>
  );
}
