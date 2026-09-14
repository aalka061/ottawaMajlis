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
 *
 * Beside it is a "?" that opens the letter itself, not a description of it. The
 * letters are built on the server from this person's own program and payments,
 * so what unfolds here is the text that would go out if the button were pressed
 * now, down to the amounts and the dates. A description would have to be kept
 * in step with the letter by hand, and would not be.
 */
export function SendMailButton({
  action,
  registrationId,
  sentAt,
  label,
  againLabel,
  preview,
}: {
  action: Action;
  registrationId: string;
  sentAt: string | null;
  label: string;
  againLabel: string;
  /** This person's copy of the letter, as it stands right now. */
  preview?: { subject: string; text: string };
}) {
  const [state, formAction] = useActionState(action, EMPTY_FORM_STATE);

  return (
    <form action={formAction} className="grid gap-2">
      <input type="hidden" name="id" value={registrationId} />
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Button label={sentAt ? againLabel : label} />
        {preview ? (
          <details className="group">
            <summary
              className="inline-flex h-5 w-5 cursor-pointer list-none items-center justify-center rounded-full border border-line font-mono text-[0.625rem] text-slate select-none hover:border-madder hover:text-madder [&::-webkit-details-marker]:hidden"
              aria-label="Show the letter this sends"
              title="Show the letter this sends"
            >
              ?
            </summary>
            {/* Pulled out of the flex row: a summary's sibling is laid out by
                the row, and the letter wants the full width under it. */}
            <div className="mt-3 border-y border-line bg-paper px-3 py-3">
              <p className="font-mono text-[0.6875rem] tracking-[0.14em] text-slate uppercase">
                Subject
              </p>
              <p className="mt-1 text-sm">{preview.subject}</p>
              <p className="mt-3 font-mono text-[0.6875rem] tracking-[0.14em] text-slate uppercase">
                The letter
              </p>
              <pre className="mt-1 max-w-prose text-sm leading-relaxed whitespace-pre-wrap">
                {preview.text}
              </pre>
            </div>
          </details>
        ) : null}
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
