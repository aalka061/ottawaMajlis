import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { isSignedIn } from "@/lib/auth";
import { answerAudioUrl, isStoredHere } from "@/lib/audio";
import { getQuestionById, listPrograms } from "@/lib/data";
import { questionAnswered } from "@/lib/email";
import { isSupabaseConfigured } from "@/lib/supabase";
import { questionStatusLabel, type QuestionStatus } from "@/lib/types";
import {
  clearAnswerAudio,
  removeQuestion,
  saveQuestion,
  sendAnswerNotice,
  setAnswerAudioLink,
} from "../../actions";
import { SendMailButton } from "../../SendMailButton";
import { AnswerRecorder } from "../AnswerRecorder";
import { AudioLinkForm, QuestionForm } from "../QuestionForm";

export const dynamic = "force-dynamic";

const STATUS_TONE: Record<QuestionStatus, string> = {
  new: "border-madder bg-madder text-paper",
  answered: "border-brass text-brass",
  published: "border-madder text-madder",
  closed: "border-line text-slate",
};

function statusTone(status: string) {
  return STATUS_TONE[status as QuestionStatus] ?? STATUS_TONE.new;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-CA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

type Params = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ confirm_delete?: string }>;
};

/**
 * One question, and the room to answer it.
 *
 * A page of its own rather than a row in a list: answering is writing, and
 * writing wants the page to itself. The list is for finding the question; this
 * is for the only thing that happens afterwards.
 */
export default async function AnswerQuestionPage({
  params,
  searchParams,
}: Params) {
  if (!(await isSignedIn())) redirect("/admin/login");

  const { id } = await params;
  const { confirm_delete: confirmDelete } = await searchParams;

  const question = isSupabaseConfigured ? await getQuestionById(id) : null;
  if (!question) notFound();

  const programs = await listPrograms();
  const programTitle = question.program_id
    ? (programs.find((p) => p.id === question.program_id)?.title ??
      "a program since deleted")
    : null;

  // The letter as it would go, for the "?" beside the button that sends it.
  const letter = questionAnswered(question);
  const recording = answerAudioUrl(question.answer_audio);
  const canWriteBack =
    Boolean(question.asker_email) &&
    (question.status === "published" || question.status === "closed");

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <Link
        href="/admin/questions"
        className="font-mono text-[0.6875rem] tracking-[0.14em] text-slate uppercase hover:text-madder"
      >
        ← Questions
      </Link>

      <div className="mt-6 flex flex-wrap items-baseline gap-3">
        <span
          className={`border px-2 py-0.5 font-mono text-[0.625rem] tracking-[0.14em] uppercase ${statusTone(question.status)}`}
        >
          {questionStatusLabel(question.status)}
        </span>
        <span className="font-mono text-xs text-slate">
          {question.asker_name ? (
            <>
              {question.asker_name}
              {question.asker_email ? (
                <>
                  {" · "}
                  <a
                    href={`mailto:${question.asker_email}`}
                    className="underline decoration-brass underline-offset-4 hover:text-madder"
                  >
                    {question.asker_email}
                  </a>
                </>
              ) : null}
            </>
          ) : (
            "Written here — nobody asked it"
          )}
          {" · asked "}
          {formatDate(question.created_at)}
          {programTitle ? ` · ${programTitle}` : ""}
          {question.session_note ? ` · ${question.session_note}` : ""}
        </span>
      </div>

      {question.asker_email ? (
        <>
          <p className="field-label mt-8">As they asked it</p>
          <p className="mt-2 max-w-prose border-l-2 border-brass pl-4 font-display text-2xl leading-snug whitespace-pre-line">
            {question.asked}
          </p>
          {question.notify ? (
            <p className="mt-3 font-mono text-xs text-brass">
              They asked to be told when it is answered
            </p>
          ) : null}
        </>
      ) : null}

      {confirmDelete ? (
        <div className="mt-8 border border-madder bg-paper p-6">
          <p className="font-display text-xl leading-snug">
            Delete this question permanently?
          </p>
          <p className="mt-2 max-w-prose text-sm text-slate">
            This erases the question, the answer, and who asked it. It cannot be
            undone. If it was answered but should not be on the site, close it
            as answered privately instead — that keeps the record.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <form action={removeQuestion}>
              <input type="hidden" name="id" value={question.id} />
              <button type="submit" className="btn btn-danger">
                Delete permanently
              </button>
            </form>
            <Link
              href={`/admin/questions/${question.id}`}
              className="btn btn-quiet"
            >
              Keep it
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-10">
          <QuestionForm
            question={question}
            programs={programs}
            action={saveQuestion}
          />
        </div>
      )}

      {confirmDelete ? null : (
        <section className="mt-10 border border-line bg-paper p-6 sm:p-8">
          <p className="field-label">The answer in his own voice</p>
          <p className="mt-2 max-w-prose text-sm text-slate">
            Optional, and never instead of the writing above: a recording
            cannot be skimmed, searched, quoted, or heard by everyone, so the
            written answer stands whether or not there is one. Record it here,
            or bring one you already have.
          </p>

          {recording ? (
            <div className="mt-6 border border-line bg-stone p-4">
              <p className="field-label">On this answer now</p>
              <audio controls src={recording} className="mt-3 w-full" />
              <div className="mt-4 flex flex-wrap items-center gap-4">
                <form action={clearAnswerAudio}>
                  <input type="hidden" name="id" value={question.id} />
                  <button type="submit" className="btn btn-quiet">
                    Take it off
                  </button>
                </form>
                <span className="font-mono text-[0.6875rem] tracking-[0.14em] text-slate uppercase">
                  {isStoredHere(question.answer_audio)
                    ? "Kept with us"
                    : "Hosted elsewhere"}
                </span>
              </div>
            </div>
          ) : null}

          <div className="mt-6">
            <AnswerRecorder questionId={question.id} />
          </div>

          <div className="mt-8 border-t border-line pt-6">
            <AudioLinkForm
              questionId={question.id}
              value={isStoredHere(question.answer_audio) ? null : question.answer_audio}
              action={setAnswerAudioLink}
            />
          </div>
        </section>
      )}

      {canWriteBack && !confirmDelete ? (
        <section className="mt-10 border border-line bg-paper p-6 sm:p-8">
          <p className="field-label">Telling them</p>
          <p className="mt-2 max-w-prose text-sm text-slate">
            {question.notify
              ? "They asked to hear when it was answered. The letter carries the answer itself, and the page as well if it is up."
              : "They did not ask to hear back, so this is only if you want to. The letter carries the answer itself."}
          </p>
          <div className="mt-4">
            <SendMailButton
              action={sendAnswerNotice}
              registrationId={question.id}
              sentAt={question.notified_at}
              label="Tell them it is answered"
              againLabel="Tell them again"
              preview={
                letter
                  ? { subject: letter.subject, text: letter.text }
                  : undefined
              }
            />
          </div>
        </section>
      ) : null}
    </main>
  );
}
