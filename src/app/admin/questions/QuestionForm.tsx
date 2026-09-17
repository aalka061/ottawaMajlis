"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { EMPTY_FORM_STATE, type FormState } from "@/lib/form-state";
import type { Program, Question } from "@/lib/types";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

/**
 * One of the buttons under a question. Each posts its own `intent`, so what
 * the press means is decided by which button was pressed rather than by a
 * status dropdown someone has to set before saving — you are publishing an
 * answer, not setting a field to published.
 */
function Press({
  intent,
  label,
  className = "btn btn-quiet",
}: {
  intent: string;
  label: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name="intent"
      value={intent}
      disabled={pending}
      className={className}
    >
      {label}
    </button>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1.5 text-sm text-madder">{message}</p>;
}

function Message({ state }: { state: FormState }) {
  if (!state.message) return null;
  return (
    <p
      className={`max-w-prose text-sm ${
        state.status === "error" ? "text-madder" : "text-slate"
      }`}
    >
      {state.message}
    </p>
  );
}

function ProgramPicker({
  id,
  programs,
  value,
}: {
  id: string;
  programs: Program[];
  value: string | null;
}) {
  return (
    <div>
      <label className="field-label" htmlFor={`program-${id}`}>
        Which program
      </label>
      <select
        id={`program-${id}`}
        name="program_id"
        defaultValue={value ?? ""}
        className="field-input mt-2"
      >
        <option value="">No program — a question on its own</option>
        {programs.map((p) => (
          <option key={p.id} value={p.id}>
            {p.title}
          </option>
        ))}
      </select>
    </div>
  );
}

function SessionField({
  id,
  value,
}: {
  id: string;
  value?: string | null;
}) {
  return (
    <div>
      <label className="field-label" htmlFor={`session-${id}`}>
        Which session
      </label>
      <input
        id={`session-${id}`}
        name="session_note"
        defaultValue={value ?? ""}
        placeholder="Session 4, or the in-person one"
        className="field-input mt-2"
      />
    </div>
  );
}

/**
 * Answering one question.
 *
 * The answer is the whole of what this page is for, so it is the only thing
 * on it at full size: everything else — which program, which session — is
 * folded away underneath, where it can be reached and cannot interrupt.
 *
 * The public wording stays in the open, small, above the answer. It is the one
 * field that has to be looked at before publishing: a question asked about
 * someone's own situation reads as a general ruling to whoever finds it next,
 * and a field nobody opens is a field nobody edits.
 */
export function QuestionForm({
  question,
  programs,
  action,
}: {
  question: Question;
  programs: Program[];
  action: Action;
}) {
  const [state, formAction] = useActionState(action, EMPTY_FORM_STATE);
  const published = question.status === "published";
  const closed = question.status === "closed";

  return (
    <form action={formAction} className="grid gap-6">
      <input type="hidden" name="id" value={question.id} />

      <div>
        <label className="field-label" htmlFor={`question-${question.id}`}>
          As it will appear on the page
        </label>
        <textarea
          id={`question-${question.id}`}
          name="question"
          rows={2}
          defaultValue={question.question}
          className="field-input mt-2 resize-y"
        />
        <FieldError message={state.fieldErrors.question} />
      </div>

      <div>
        <label
          className="field-label text-madder"
          htmlFor={`answer-${question.id}`}
        >
          The answer
        </label>
        <textarea
          id={`answer-${question.id}`}
          name="answer"
          rows={16}
          defaultValue={question.answer}
          placeholder="A blank line starts a new paragraph. Nothing else is read as anything but words."
          className="field-input mt-2 resize-y"
        />
        <FieldError message={state.fieldErrors.answer} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {published ? (
          <>
            <Press intent="save" label="Save changes" className="btn" />
            <Press intent="unpublish" label="Take it off the site" />
          </>
        ) : (
          <>
            <Press intent="publish" label="Publish the answer" className="btn" />
            <Press intent="save" label="Save without publishing" />
          </>
        )}
      </div>

      <Message state={state} />

      <details className="border-y border-line">
        <summary className="cursor-pointer py-3 font-mono text-[0.6875rem] tracking-[0.14em] text-slate uppercase select-none hover:text-madder">
          Which program, which session
        </summary>
        <div className="grid gap-4 pb-4 sm:grid-cols-2">
          <ProgramPicker
            id={question.id}
            programs={programs}
            value={question.program_id}
          />
          <SessionField id={question.id} value={question.session_note} />
        </div>
        <p className="max-w-prose pb-4 text-sm text-slate">
          Shown in small type under the answer on the page. Both are optional,
          and a question asked through the form arrives with the program
          already set from whoever asked it.
        </p>
      </details>

      <details className="border-b border-line">
        <summary className="cursor-pointer py-3 font-mono text-[0.6875rem] tracking-[0.14em] text-slate uppercase select-none hover:text-madder">
          Other endings
        </summary>
        <div className="grid gap-3 pb-5">
          <p className="max-w-prose text-sm text-slate">
            A question can be answered without going up — a private matter, or
            one answered to the person alone. Closing it keeps the record and
            keeps it off the site. Deleting erases it.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            {closed ? (
              <Press intent="reopen" label="Put it back" />
            ) : published ? null : (
              <Press intent="private" label="Answered privately" />
            )}
            <Link
              href={`/admin/questions/${question.id}?confirm_delete=1`}
              className="font-mono text-[0.6875rem] tracking-[0.14em] text-slate uppercase hover:text-madder"
            >
              Delete
            </Link>
          </div>
        </div>
      </details>
    </form>
  );
}

/**
 * A question entered here rather than asked through the form. Two things need
 * it: a page with nothing on it the day it opens, and the questions that
 * arrive by every route other than the form — after a session, by email, from
 * someone who never registered.
 */
export function NewQuestionForm({
  programs,
  action,
}: {
  programs: Program[];
  action: Action;
}) {
  const [state, formAction] = useActionState(action, EMPTY_FORM_STATE);

  return (
    <form action={formAction} className="mt-6 grid gap-4">
      <div>
        <label className="field-label" htmlFor="new-question">
          The question
        </label>
        <textarea
          id="new-question"
          name="question"
          rows={3}
          placeholder="As it should read on the page"
          className="field-input mt-2 resize-y"
        />
        <FieldError message={state.fieldErrors.question} />
      </div>

      <div>
        <label className="field-label" htmlFor="new-answer">
          The answer
        </label>
        <textarea
          id="new-answer"
          name="answer"
          rows={8}
          placeholder="Leave it empty to come back to later."
          className="field-input mt-2 resize-y"
        />
        <FieldError message={state.fieldErrors.answer} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <ProgramPicker id="new" programs={programs} value={null} />
        <SessionField id="new" />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Press intent="publish" label="Add and publish" className="btn" />
        <Press intent="save" label="Add without publishing" />
      </div>

      <Message state={state} />
    </form>
  );
}
