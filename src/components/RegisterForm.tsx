"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { register } from "@/app/actions";
import { PaymentPanel } from "@/components/PaymentPanel";
import { EMPTY_FORM_STATE } from "@/lib/form-state";
import { formatPhone } from "@/lib/phone";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn" disabled={pending}>
      {pending ? "Registering…" : "Register"}
    </button>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1.5 text-sm text-madder">{message}</p>;
}

export function RegisterForm({
  programId,
  programTitle,
  feeNote,
}: {
  programId: string;
  programTitle: string;
  feeNote: string;
}) {
  const [state, action] = useActionState(register, EMPTY_FORM_STATE);
  const [phone, setPhone] = useState("");

  if (state.status === "ok") {
    return (
      <div className="max-w-xl">
        <p className="rubric">Registered</p>
        <h3 className="mt-3 font-display text-3xl leading-tight">
          We have your details for {programTitle}. One step left.
        </h3>
        <p className="mt-4 max-w-prose text-slate">
          {state.message ||
            "Send the fee by Interac e-transfer and the place is yours. Registering does not hold it — the transfer does."}
        </p>
        <div className="mt-7">
          <PaymentPanel feeNote={feeNote} />
        </div>
      </div>
    );
  }

  return (
    <form action={action} className="max-w-xl">
      <input type="hidden" name="program_id" value={programId} />
      <div
        aria-hidden="true"
        className="absolute left-[-9999px] h-px w-px overflow-hidden"
      >
        <label htmlFor="company">Company</label>
        <input id="company" name="company" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="field-label" htmlFor="full_name">
            Name
          </label>
          <input
            id="full_name"
            name="full_name"
            className="field-input mt-2"
            autoComplete="name"
            required
          />
          <FieldError message={state.fieldErrors.full_name} />
        </div>

        <div>
          <label className="field-label" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            className="field-input mt-2"
            autoComplete="email"
            required
          />
          <FieldError message={state.fieldErrors.email} />
        </div>

        <div>
          <label className="field-label" htmlFor="phone">
            WhatsApp number
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            inputMode="tel"
            className="field-input mt-2"
            autoComplete="tel"
            placeholder="(613) 555-0134"
            value={phone}
            onChange={(e) => setPhone(formatPhone(e.target.value))}
            aria-describedby="phone-hint"
            required
          />
          <p id="phone-hint" className="mt-1.5 text-sm text-slate">
            This is how we reach you. Outside Canada, start with + and your
            country code.
          </p>
          <FieldError message={state.fieldErrors.phone} />
        </div>

        <div className="sm:col-span-2">
          <label className="field-label" htmlFor="heard_from">
            How did you hear about the majlis?{" "}
            <span className="normal-case">(optional)</span>
          </label>
          <input
            id="heard_from"
            name="heard_from"
            className="field-input mt-2"
            placeholder="Our WhatsApp group, another WhatsApp group, a friend…"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="field-label" htmlFor="note">
            Anything we should know?{" "}
            <span className="normal-case">(optional)</span>
          </label>
          <textarea
            id="note"
            name="note"
            rows={3}
            className="field-input mt-2 resize-y"
          />
        </div>
      </div>

      {state.status === "error" && state.message ? (
        <p className="mt-5 border-l-2 border-madder pl-3 text-sm text-madder">
          {state.message}
        </p>
      ) : null}

      <div className="mt-7 flex flex-wrap items-center gap-4">
        <SubmitButton />
        <p className="font-mono text-[0.6875rem] tracking-[0.14em] text-slate uppercase">
          Then send the e-transfer
        </p>
      </div>
    </form>
  );
}
