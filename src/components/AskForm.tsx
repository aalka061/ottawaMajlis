"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { askQuestion } from "@/app/actions";
import { EMPTY_FORM_STATE } from "@/lib/form-state";
import { CONTACT_EMAIL } from "@/lib/site";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn" disabled={pending}>
      {pending ? "Sending…" : "Send the question"}
    </button>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1.5 text-sm text-madder">{message}</p>;
}

/**
 * Asking a question, for people on the register.
 *
 * The email is the whole of the gate, and the form says so outright rather
 * than letting someone write a paragraph and then be turned away by it. What
 * happens next is said outright too: nothing appears here on its own, and
 * nothing appears with a name on it.
 */
export function AskForm() {
  const [state, action] = useActionState(askQuestion, EMPTY_FORM_STATE);

  if (state.status === "ok") {
    return (
      <div className="max-w-xl">
        <p className="rubric">Sent</p>
        <h3 className="mt-3 font-display text-3xl leading-tight">
          Your question has reached the teacher.
        </h3>
        <p className="mt-4 max-w-prose text-slate">
          Nothing happens automatically from here. It is read and answered by
          hand, and if the answer is one others would want too, it appears on
          this page — with no name beside it.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="max-w-xl">
      <div
        aria-hidden="true"
        className="absolute left-[-9999px] h-px w-px overflow-hidden"
      >
        <label htmlFor="company">Company</label>
        <input id="company" name="company" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="grid gap-5">
        <div>
          <label className="field-label" htmlFor="ask-email">
            The email you registered with
          </label>
          <input
            id="ask-email"
            name="email"
            type="email"
            className="field-input mt-2"
            autoComplete="email"
            aria-describedby="ask-email-hint"
            required
          />
          <p id="ask-email-hint" className="mt-1.5 text-sm text-slate">
            This page is open to everyone, but asking is for people in the
            circle. Your address is never shown here.
          </p>
          <FieldError message={state.fieldErrors.email} />
        </div>

        <div>
          <label className="field-label" htmlFor="ask-question">
            Your question
          </label>
          <textarea
            id="ask-question"
            name="question"
            rows={5}
            className="field-input mt-2 resize-y"
            required
          />
          <FieldError message={state.fieldErrors.question} />
        </div>

        <div>
          <label className="field-label" htmlFor="ask-session">
            Which session is it about?{" "}
            <span className="normal-case">(optional)</span>
          </label>
          <input
            id="ask-session"
            name="session_note"
            className="field-input mt-2"
            placeholder="Session 4, last Tuesday, the in-person one…"
          />
        </div>

        <label className="flex max-w-prose items-start gap-3 text-sm text-slate">
          <input
            type="checkbox"
            name="notify"
            defaultChecked
            className="mt-1 accent-madder"
          />
          <span>
            Email me when it is answered. Untick it and you can simply come
            back to this page.
          </span>
        </label>
      </div>

      {state.status === "error" && state.message ? (
        <p className="mt-5 max-w-prose border-l-2 border-madder pl-3 text-sm text-madder">
          {state.message}
        </p>
      ) : null}

      <div className="mt-7 flex flex-wrap items-center gap-4">
        <SubmitButton />
        <p className="max-w-xs font-mono text-[0.6875rem] tracking-[0.14em] text-slate uppercase">
          Published without your name, if at all
        </p>
      </div>

      <p className="mt-6 max-w-prose text-sm text-slate">
        Not registered? Write to{" "}
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="underline decoration-brass underline-offset-4 hover:text-madder"
        >
          {CONTACT_EMAIL}
        </a>{" "}
        — your question can still be answered on this page.
      </p>
    </form>
  );
}
