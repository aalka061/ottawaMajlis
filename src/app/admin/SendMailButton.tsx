"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { EMPTY_FORM_STATE, type FormState } from "@/lib/form-state";

type Action = (state: FormState, formData: FormData) => Promise<FormState>;

function Button({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-quiet" disabled={pending}>
      {pending ? "Sending…" : label}
    </button>
  );
}

/**
 * One person, one letter, one button. Both of the mails the register sends —
 * the payment confirmation and the payment reminder — are pressed rather than
 * fired by a status change: marking someone paid is bookkeeping, writing to
 * them is not, and you should be able to settle the money first and write
 * when you mean to.
 *
 * The button never disappears once it has been used. It reads "Send it again"
 * beside the date it last went out — the confirmation is occasionally needed a
 * second time, and a reminder is expected to be.
 */
export function SendMailButton({
  action,
  registrationId,
  sentAt,
  label,
  againLabel,
}: {
  action: Action;
  registrationId: string;
  sentAt: string | null;
  label: string;
  againLabel: string;
}) {
  const [state, formAction] = useActionState(action, EMPTY_FORM_STATE);

  return (
    <form action={formAction} className="grid gap-2">
      <input type="hidden" name="id" value={registrationId} />
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Button label={sentAt ? againLabel : label} />
        {sentAt ? (
          <span className="font-mono text-[0.6875rem] tracking-[0.14em] text-slate uppercase">
            Sent{" "}
            {new Date(sentAt).toLocaleDateString("en-CA", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </span>
        ) : null}
      </div>
      {state.message ? (
        <p
          className={`max-w-prose text-sm ${
            state.status === "error" ? "text-madder" : "text-slate"
          }`}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
