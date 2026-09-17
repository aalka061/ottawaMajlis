"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { EMPTY_FORM_STATE, type FormState } from "@/lib/form-state";
import type { Program, Question } from "@/lib/types";

export type Action = (
  prev: FormState,
  formData: FormData,
) => Promise<FormState>;

/**
 * One of the buttons under a question. Each posts its own `intent`, so what
 * the press means is decided by which button was pressed rather than by a
 * status dropdown someone has to set before saving — you are publishing an
 * answer, not setting a field to published.
 */
export function Press({
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

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1.5 text-sm text-madder">{message}</p>;
}

export function Message({ state }: { state: FormState }) {
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

function SessionField({ id, value }: { id: string; value?: string | null }) {
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
 * Writing the answer, and what to do with it.
 *
 * The box is the page while it is open. What the question will read as, which
 * program it belongs to, which session it came from — all real, none of them
 * the thing somebody sat down to do — fold away underneath.
 *
 * `spoken` changes what is being asked for. With a recording kept, the writing
 * beside it is the gist: the two or three lines that let an answer be skimmed,
 * searched, and read by someone who cannot hear it.
 */
export function AnswerEditor({
  question,
  programs,
  action,
  spoken,
  onLeave,
}: {
  question: Question;
  programs: Program[];
  action: Action;
  spoken: boolean;
  onLeave?: () => void;
}) {
  const [state, formAction] = useActionState(action, EMPTY_FORM_STATE);
  const published = question.status === "published";

  return (
    <form action={formAction} className="grid gap-6">
      <input type="hidden" name="id" value={question.id} />

      <div>
        <label
          className="field-label text-madder"
          htmlFor={`answer-${question.id}`}
        >
          {spoken ? "What the recording says" : "The answer"}
        </label>
        <p className="mt-1.5 max-w-prose text-sm text-slate">
          {spoken
            ? "Two or three lines is enough. It sits above the recording on the page, and it is what someone skimming, searching, or unable to hear the recording is left with."
            : "A blank line starts a new paragraph. Nothing else is read as anything but words."}
        </p>
        <textarea
          id={`answer-${question.id}`}
          name="answer"
          rows={spoken ? 5 : 14}
          defaultValue={question.answer}
          className="field-input mt-2 resize-y"
        />
        <FieldError message={state.fieldErrors.answer} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {published ? (
          <Press intent="save" label="Save changes" className="btn" />
        ) : (
          <>
            <Press
              intent="publish"
              label="Publish the answer"
              className="btn"
            />
            <Press intent="save" label="Save without publishing" />
          </>
        )}
        {onLeave ? (
          <button
            type="button"
            onClick={onLeave}
            className="font-mono text-[0.6875rem] tracking-[0.14em] text-slate uppercase hover:text-madder"
          >
            Leave it
          </button>
        ) : null}
      </div>

      <Message state={state} />

      <details className="border-y border-line">
        <summary className="cursor-pointer py-3 font-mono text-[0.6875rem] tracking-[0.14em] text-slate uppercase select-none hover:text-madder">
          The wording of the question, the program, the session
        </summary>
        <div className="grid gap-4 pb-5">
          <div>
            <label className="field-label" htmlFor={`question-${question.id}`}>
              The question, as visitors read it
            </label>
            <p className="mt-1.5 max-w-prose text-sm text-slate">
              {question.asker_email
                ? "It starts as their own words. Edit it into the general question and take out whatever was about them in particular — what they actually wrote is kept in the register and never changes."
                : "What visitors read at the top of the answer."}
            </p>
            <textarea
              id={`question-${question.id}`}
              name="question"
              rows={2}
              defaultValue={question.question}
              className="field-input mt-2 resize-y"
            />
            <FieldError message={state.fieldErrors.question} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <ProgramPicker
              id={question.id}
              programs={programs}
              value={question.program_id}
            />
            <SessionField id={question.id} value={question.session_note} />
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

/**
 * A recording that already lives somewhere else, by its address.
 *
 * Its own small form rather than a field in the answer form: the recorder
 * beside it writes the same column, and two things writing one column through
 * one form is how a saved page quietly undoes an upload.
 */
export function AudioLinkForm({
  questionId,
  value,
  action,
}: {
  questionId: string;
  value: string | null;
  action: Action;
}) {
  const [state, formAction] = useActionState(action, EMPTY_FORM_STATE);

  return (
    <form action={formAction} className="grid gap-3">
      <input type="hidden" name="id" value={questionId} />
      <div>
        <label className="field-label" htmlFor={`audio-link-${questionId}`}>
          Or a link to one hosted elsewhere
        </label>
        <input
          id={`audio-link-${questionId}`}
          name="answer_audio"
          defaultValue={value ?? ""}
          placeholder="https://…/answer.mp3"
          className="field-input mt-2"
        />
        <FieldError message={state.fieldErrors.answer_audio} />
        <p className="mt-1.5 max-w-prose text-sm text-slate">
          It has to point at the file itself. A Google Drive or Dropbox sharing
          page is a page, not a recording, and a player pointed at one plays
          nothing. Empty takes the recording off.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <Press intent="link" label="Save the link" />
        <Message state={state} />
      </div>
    </form>
  );
}
