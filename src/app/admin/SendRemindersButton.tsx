"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { EMPTY_FORM_STATE } from "@/lib/form-state";
import { sendPaymentReminders } from "./actions";

function Button({ count }: { count: number }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-danger" disabled={pending}>
      {pending
        ? "Sending the round…"
        : `Send ${count} reminder${count === 1 ? "" : "s"}`}
    </button>
  );
}

/**
 * The whole round at once, for the week you sit down and chase everyone.
 *
 * It sits behind the list of who is about to be written to, because this is
 * the one button here that reaches people you have not looked at one by one.
 * The round is paced to stay inside the mail server's rate limit, so it takes
 * about a second a person — the button says so while it works.
 */
export function SendRemindersButton({ count }: { count: number }) {
  const [state, action] = useActionState(
    sendPaymentReminders,
    EMPTY_FORM_STATE,
  );

  return (
    <form action={action} className="grid gap-3">
      <div>
        <Button count={count} />
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
