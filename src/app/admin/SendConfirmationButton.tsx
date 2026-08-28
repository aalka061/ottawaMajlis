"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { EMPTY_FORM_STATE } from "@/lib/form-state";
import { sendPaymentConfirmation } from "./actions";

function Button({ again }: { again: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-quiet" disabled={pending}>
      {pending ? "Sending…" : again ? "Send it again" : "Send confirmation"}
    </button>
  );
}

/**
 * Sends the one email that says their payment arrived and their place is
 * theirs. It is deliberately a button and not a consequence of marking someone
 * paid: you press it when you mean to write to them.
 *
 * Once it has gone out the button stays, reading "Send it again" beside the
 * date — the same person occasionally needs it a second time, and a button
 * that vanishes is worse than one that admits a second press.
 */
export function SendConfirmationButton({
  registrationId,
  sentAt,
}: {
  registrationId: string;
  sentAt: string | null;
}) {
  const [state, action] = useActionState(
    sendPaymentConfirmation,
    EMPTY_FORM_STATE,
  );

  return (
    <form action={action} className="grid gap-2">
      <input type="hidden" name="id" value={registrationId} />
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Button again={Boolean(sentAt)} />
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
