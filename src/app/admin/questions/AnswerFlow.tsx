"use client";

import { useState } from "react";
import { isStoredHere } from "@/lib/audio";
import type { Program, Question } from "@/lib/types";
import { AnswerRecorder } from "./AnswerRecorder";
import {
  AnswerEditor,
  AudioLinkForm,
  Message,
  Press,
  type Action,
} from "./QuestionForm";
import { useActionState } from "react";
import { EMPTY_FORM_STATE } from "@/lib/form-state";

/**
 * The answer as it reads, one paragraph per blank line — the same shape the
 * public page gives it, so what is checked here is what goes out.
 */
function Written({ text }: { text: string }) {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean);
  return (
    <>
      {paragraphs.map((part, i) => (
        <p key={i} className="mt-3 max-w-prose whitespace-pre-line first:mt-0">
          {part}
        </p>
      ))}
    </>
  );
}

/** Publishing or taking down from the summary, where no field is open. */
function StateButtons({
  questionId,
  published,
  action,
}: {
  questionId: string;
  published: boolean;
  action: Action;
}) {
  const [state, formAction] = useActionState(action, EMPTY_FORM_STATE);
  return (
    <form action={formAction} className="flex flex-wrap items-center gap-3">
      <input type="hidden" name="id" value={questionId} />
      {published ? (
        <Press intent="unpublish" label="Take it off the site" />
      ) : (
        <Press intent="publish" label="Publish the answer" className="btn" />
      )}
      <Message state={state} />
    </form>
  );
}

type Step = "start" | "choose" | "record" | "write" | "summary";

/**
 * Answering a question, one thing at a time.
 *
 * The page opens on the question and a single button, because that is the
 * whole of the decision at that moment. Pressing it asks how — spoken or
 * written — and only then is anything asked to be filled in. A recording is
 * followed by a line or two in writing, which is what makes the answer
 * searchable and readable by someone who cannot hear it.
 *
 * A question already answered opens on what the answer is, not on a form: most
 * visits to one of those are to read it, publish it, or write back to whoever
 * asked. Editing is a press away.
 */
export function AnswerFlow({
  question,
  programs,
  saveAction,
  audioLinkAction,
  clearAudioAction,
  recordingUrl,
}: {
  question: Question;
  programs: Program[];
  saveAction: Action;
  audioLinkAction: Action;
  clearAudioAction: (formData: FormData) => Promise<void>;
  recordingUrl: string | null;
}) {
  const written = question.answer.trim().length > 0;
  const answered = written || Boolean(question.answer_audio);
  const [step, setStep] = useState<Step>(answered ? "summary" : "start");

  // An answer that exists is what the page is about; the steps are only for
  // making one. A save or an upload re-renders this from the database, so the
  // summary is always the answer as it now stands.
  const showing: Step = answered && step === "start" ? "summary" : step;

  if (showing === "start") {
    return (
      <section className="border border-line bg-paper p-6 sm:p-8">
        <p className="field-label">Nobody has answered this yet</p>
        <p className="mt-2 max-w-prose text-slate">
          Answer it in writing, or speak it and add a line saying what it says.
          Nothing reaches the site until you publish it.
        </p>
        <div className="mt-5">
          <button
            type="button"
            onClick={() => setStep("choose")}
            className="btn"
          >
            Answer this question
          </button>
        </div>
      </section>
    );
  }

  if (showing === "choose") {
    return (
      <section className="border border-line bg-paper p-6 sm:p-8">
        <p className="field-label">How would you like to answer?</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setStep("record")}
            className="border border-line bg-stone p-5 text-left transition-colors hover:border-madder"
          >
            <span className="block font-display text-2xl leading-none">
              Speak it
            </span>
            <span className="mt-3 block text-sm text-slate">
              Record here, listen to it, keep it. Afterwards you are asked for
              two or three lines saying what it says.
            </span>
          </button>
          <button
            type="button"
            onClick={() => setStep("write")}
            className="border border-line bg-stone p-5 text-left transition-colors hover:border-madder"
          >
            <span className="block font-display text-2xl leading-none">
              Write it
            </span>
            <span className="mt-3 block text-sm text-slate">
              Type the answer. Plain paragraphs, nothing to format, and it can
              be saved half finished.
            </span>
          </button>
        </div>
        <button
          type="button"
          onClick={() => setStep(answered ? "summary" : "start")}
          className="mt-5 font-mono text-[0.6875rem] tracking-[0.14em] text-slate uppercase hover:text-madder"
        >
          ← Back
        </button>
      </section>
    );
  }

  if (showing === "record") {
    return (
      <section className="border border-line bg-paper p-6 sm:p-8">
        <p className="field-label">Speaking the answer</p>
        <p className="mt-2 max-w-prose text-sm text-slate">
          The first take is played back before anything is kept. Whatever is
          recorded is turned into an MP3 here, so it plays on every phone.
        </p>
        {recordingUrl ? (
          <div className="mt-5 border border-line bg-stone p-4">
            <p className="field-label">On this answer now</p>
            <audio controls src={recordingUrl} className="mt-3 w-full" />
            <form action={clearAudioAction} className="mt-4">
              <input type="hidden" name="id" value={question.id} />
              <button type="submit" className="btn btn-quiet">
                Take it off
              </button>
            </form>
          </div>
        ) : null}
        <div className="mt-6">
          <AnswerRecorder
            questionId={question.id}
            onKept={() => setStep("write")}
          />
        </div>
        <div className="mt-8 border-t border-line pt-6">
          <AudioLinkForm
            questionId={question.id}
            value={isStoredHere(question.answer_audio) ? null : question.answer_audio}
            action={audioLinkAction}
          />
        </div>
        <button
          type="button"
          onClick={() => setStep(answered ? "summary" : "choose")}
          className="mt-6 font-mono text-[0.6875rem] tracking-[0.14em] text-slate uppercase hover:text-madder"
        >
          ← Back
        </button>
      </section>
    );
  }

  if (showing === "write") {
    return (
      <section className="border border-line bg-paper p-6 sm:p-8">
        {question.answer_audio ? (
          <>
            <p className="field-label">The recording is kept</p>
            <p className="mt-2 max-w-prose text-sm text-slate">
              One thing left: a line or two in writing beside it.
            </p>
            {recordingUrl ? (
              <audio controls src={recordingUrl} className="mt-4 w-full" />
            ) : null}
            <div className="mt-6">
              <AnswerEditor
                question={question}
                programs={programs}
                action={saveAction}
                spoken
                onLeave={() => setStep(answered ? "summary" : "start")}
              />
            </div>
          </>
        ) : (
          <AnswerEditor
            question={question}
            programs={programs}
            action={saveAction}
            spoken={false}
            onLeave={() => setStep(answered ? "summary" : "start")}
          />
        )}
      </section>
    );
  }

  return (
    <section className="border border-line bg-paper p-6 sm:p-8">
      <p className="field-label">The answer</p>
      <div className="mt-3 text-slate">
        {written ? (
          <Written text={question.answer} />
        ) : (
          <p className="max-w-prose text-madder">
            Recorded, with nothing in writing beside it. It cannot be published
            like that — a recording alone cannot be skimmed, searched, or heard
            by everyone.
          </p>
        )}
      </div>

      {recordingUrl ? (
        <div className="mt-5 border-t border-line pt-5">
          <p className="field-label">Spoken</p>
          <audio controls preload="none" src={recordingUrl} className="mt-2 w-full" />
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setStep("write")}
          className="btn btn-quiet"
        >
          {written ? "Edit the writing" : "Write what it says"}
        </button>
        <button
          type="button"
          onClick={() => setStep("record")}
          className="btn btn-quiet"
        >
          {question.answer_audio ? "Change the recording" : "Add a recording"}
        </button>
      </div>

      <div className="mt-5 border-t border-line pt-5">
        <StateButtons
          questionId={question.id}
          published={question.status === "published"}
          action={saveAction}
        />
      </div>
    </section>
  );
}
