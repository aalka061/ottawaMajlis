import Link from "next/link";
import { redirect } from "next/navigation";
import { isSignedIn } from "@/lib/auth";
import { getSettings, listPrograms, listQuestions } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/supabase";
import {
  QUESTION_STATUS_LABEL,
  QUESTION_STATUS_ORDER,
  questionStatusLabel,
  type Question,
  type QuestionStatus,
} from "@/lib/types";
import { addQuestion, setAsking } from "../actions";
import { NewQuestionForm } from "./QuestionForm";

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

/**
 * Unanswered first, then the ones written but not up, then the page itself,
 * then what was closed. This list is what is waiting on you, and the thing
 * waiting on you is a question nobody has answered.
 */
function inWorkingOrder(questions: Question[]) {
  const rank = (q: Question) => {
    const at = QUESTION_STATUS_ORDER.indexOf(q.status);
    return at === -1 ? 0 : at;
  };
  return [...questions].sort((a, b) => rank(a) - rank(b));
}

/** Enough of a question to know which one it is. */
function opening(text: string) {
  const line = text.trim().replace(/\s+/g, " ");
  return line.length > 150 ? `${line.slice(0, 150)}…` : line;
}

export default async function QuestionsAdminPage() {
  if (!(await isSignedIn())) redirect("/admin/login");

  if (!isSupabaseConfigured) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-20">
        <p className="rubric">Questions</p>
        <h1 className="mt-4 font-display text-4xl leading-tight">
          The database is not connected.
        </h1>
        <p className="mt-4 text-slate">
          Run <code className="font-mono text-sm">supabase/schema.sql</code> in
          your Supabase project, or the questions migration if it is already
          running, and reload.
        </p>
      </main>
    );
  }

  const [questions, programs, settings] = await Promise.all([
    listQuestions(),
    listPrograms(),
    getSettings(),
  ]);
  const programTitle = new Map(programs.map((p) => [p.id, p.title]));
  const counts = QUESTION_STATUS_ORDER.map((status) => ({
    status,
    count: questions.filter((q) => q.status === status).length,
  }));

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <Link
        href="/admin"
        className="font-mono text-[0.6875rem] tracking-[0.14em] text-slate uppercase hover:text-madder"
      >
        ← The register
      </Link>

      <div className="mt-6 flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <p className="rubric">Ottawa Majless</p>
          <h1 className="mt-3 font-display text-4xl leading-tight">
            Questions
          </h1>
        </div>
        <Link href="/questions" target="_blank" className="btn btn-quiet">
          See the page
        </Link>
      </div>

      <p className="mt-4 max-w-prose text-slate">
        Nothing here is on the site until you publish it. Open a question to
        answer it; what someone asked is kept as they wrote it, and no name is
        ever shown beside an answer.
      </p>

      {/*
        * The one switch on this page that changes what the public sees before
        * anything is published. It closes the form only: the answers stay up,
        * and the button below still adds a question by hand.
        */}
      <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border border-line px-4 py-4">
        <div className="max-w-prose">
          <p className="field-label">The form at the bottom of the page</p>
          <p className="mt-2 text-sm text-slate">
            {settings.questions_open
              ? "Open. Anyone on the register can ask, and what they ask arrives here."
              : "Closed. Everything published is still on the page to read; the form for asking is not there, and nothing can be sent to it."}
          </p>
        </div>
        <form action={setAsking}>
          <input
            type="hidden"
            name="open"
            value={settings.questions_open ? "false" : "true"}
          />
          <button type="submit" className="btn btn-quiet">
            {settings.questions_open ? "Close it" : "Open it"}
          </button>
        </form>
      </div>

      <dl className="mt-10 grid grid-cols-2 gap-px border border-line bg-line sm:grid-cols-4">
        {counts.map(({ status, count }) => (
          <div key={status} className="bg-paper px-4 py-5">
            <dt className="field-label">{QUESTION_STATUS_LABEL[status]}</dt>
            <dd className="mt-2 font-mono text-3xl">{count}</dd>
          </div>
        ))}
      </dl>

      {questions.length === 0 ? (
        <p className="mt-12 text-slate">
          No questions yet. They land here the moment someone asks one.
        </p>
      ) : (
        <ul className="mt-12 divide-y divide-line border-y border-line">
          {inWorkingOrder(questions).map((q) => (
            <li key={q.id}>
              <Link
                href={`/admin/questions/${q.id}`}
                className="group flex flex-wrap items-baseline justify-between gap-x-6 gap-y-3 py-5"
              >
                <div className="max-w-2xl">
                  <div className="flex flex-wrap items-baseline gap-3">
                    <span
                      className={`border px-2 py-0.5 font-mono text-[0.625rem] tracking-[0.14em] uppercase ${statusTone(q.status)}`}
                    >
                      {questionStatusLabel(q.status)}
                    </span>
                    <span className="font-mono text-xs text-slate">
                      {q.asker_name ?? "Written here"}
                      {" · "}
                      {formatDate(q.created_at)}
                      {q.program_id
                        ? ` · ${programTitle.get(q.program_id) ?? "a program since deleted"}`
                        : ""}
                      {q.session_note ? ` · ${q.session_note}` : ""}
                    </span>
                  </div>
                  <p className="mt-2 font-display text-xl leading-snug group-hover:text-madder">
                    {opening(q.question || q.asked)}
                  </p>
                </div>
                <span className="font-mono text-[0.6875rem] tracking-[0.14em] text-slate uppercase group-hover:text-madder">
                  {q.status === "new" ? "Answer →" : "Open →"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <details className="mt-12 border border-line bg-paper p-6 sm:p-8">
        <summary className="cursor-pointer font-mono text-[0.6875rem] tracking-[0.14em] text-slate uppercase select-none hover:text-madder">
          Write a question yourself
        </summary>
        <p className="mt-4 max-w-prose text-sm text-slate">
          For the ones that arrive by every other route — asked out loud after a
          session, sent in by email, or a question nobody asked and everybody
          wonders. There is no asker on these, so there is nobody to write back
          to when it goes up.
        </p>
        <NewQuestionForm programs={programs} action={addQuestion} />
      </details>
    </main>
  );
}
