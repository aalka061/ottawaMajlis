import type { Metadata } from "next";
import { getPrograms, listPublishedQuestions } from "@/lib/data";
import { AskForm } from "@/components/AskForm";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import type { Question } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Questions and answers",
  description:
    "Questions asked by people in the circle, answered by the teacher. Read what has been asked before.",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-CA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * The answer as written, one paragraph per blank line. No markup of any kind:
 * an answer is prose, and the first thing a markup would buy is a way for a
 * broken one to reach the page.
 */
function Answer({ text }: { text: string }) {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  return (
    <>
      {paragraphs.map((paragraph, i) => (
        <p key={i} className="mt-4 max-w-prose whitespace-pre-line first:mt-0">
          {paragraph}
        </p>
      ))}
    </>
  );
}

/**
 * One question, folded away until it is asked for. The questions are what
 * someone scans; the answers are what they came for, and a page of twenty
 * answers open at once is a page nobody can scan.
 */
function Entry({ q, program }: { q: Question; program?: string }) {
  const asked = [program, q.session_note].filter(Boolean).join(" · ");

  return (
    <details className="group py-5">
      <summary className="flex cursor-pointer list-none items-baseline gap-4 select-none [&::-webkit-details-marker]:hidden">
        <span className="mt-1 font-mono text-sm text-brass transition-colors group-open:text-madder">
          <span className="group-open:hidden">+</span>
          <span className="hidden group-open:inline">−</span>
        </span>
        <span className="font-display text-xl leading-snug group-hover:text-madder">
          {q.question}
        </span>
      </summary>
      <div className="mt-4 pl-8">
        <div className="text-slate">
          <Answer text={q.answer} />
        </div>
        <p className="mt-4 font-mono text-[0.6875rem] tracking-[0.14em] text-slate uppercase">
          {asked ? `${asked} · ` : ""}
          Answered {formatDate(q.published_at ?? q.created_at)}
        </p>
      </div>
    </details>
  );
}

export default async function QuestionsPage() {
  const [questions, programs] = await Promise.all([
    listPublishedQuestions(),
    getPrograms(),
  ]);
  // Only the programs the site shows. A question that belongs to a draft
  // carries no program line rather than naming a program nobody can read.
  const programTitle = new Map(programs.map((p) => [p.id, p.title]));

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-6">
        <section className="py-14 sm:py-20">
          <p className="rubric">Questions</p>
          <h1 className="mt-4 max-w-2xl font-display text-4xl leading-tight sm:text-5xl">
            What has been asked, and what was answered
          </h1>
          <p className="mt-6 max-w-prose text-lg text-slate">
            Questions put by people in the circle, answered by the teacher and
            kept here afterwards. They are published without the name of whoever
            asked.
          </p>
        </section>

        {questions.length === 0 ? (
          <p className="max-w-prose border-y border-line py-8 text-slate">
            Nothing has been published here yet. Questions asked during the term
            are answered and collected on this page.
          </p>
        ) : (
          <div className="divide-y divide-line border-y border-line">
            {questions.map((q) => (
              <Entry
                key={q.id}
                q={q}
                program={
                  q.program_id ? programTitle.get(q.program_id) : undefined
                }
              />
            ))}
          </div>
        )}

        <section id="ask" className="mt-16 border-t border-line pt-12 pb-20">
          <p className="rubric">Ask</p>
          <h2 className="mt-3 max-w-2xl font-display text-3xl leading-tight">
            Something of your own
          </h2>
          <p className="mt-4 max-w-prose text-slate">
            Questions are read and answered by hand. Nothing you write here
            appears on the page on its own, and nothing appears with your name
            on it.
          </p>
          <div className="mt-8">
            <AskForm />
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
