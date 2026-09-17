import type { Metadata } from "next";
import { answerAudioUrl } from "@/lib/audio";
import { getPrograms, listPublishedQuestions } from "@/lib/data";
import { AskForm } from "@/components/AskForm";
import { QuestionList, type Entry } from "@/components/QuestionList";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";

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

export default async function QuestionsPage() {
  const [questions, programs] = await Promise.all([
    listPublishedQuestions(),
    getPrograms(),
  ]);
  // Only the programs the site shows. A question that belongs to a draft
  // carries no program line rather than naming a program nobody can read.
  const programTitle = new Map(programs.map((p) => [p.id, p.title]));

  const entries: Entry[] = questions.map((q) => ({
    id: q.id,
    question: q.question,
    answer: q.answer,
    about: [
      q.program_id ? programTitle.get(q.program_id) : undefined,
      q.session_note,
    ]
      .filter(Boolean)
      .join(" · "),
    answered: formatDate(q.published_at ?? q.created_at),
    audio: answerAudioUrl(q.answer_audio),
    audioSeconds: q.answer_audio_seconds,
  }));

  /**
   * The same questions and answers said again for a search engine, which is
   * how someone who would otherwise have written to ask finds the answer
   * already given. Only the written answer goes in: a recording is not
   * something a search result can quote, and an answer with nothing written
   * beside it is left out altogether rather than offered up empty.
   */
  const written = entries.filter((entry) => entry.answer.trim().length > 0);
  const structured = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: written.map((entry) => ({
      "@type": "Question",
      name: entry.question,
      acceptedAnswer: { "@type": "Answer", text: entry.answer },
    })),
  };

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-5 sm:px-6">
        <section className="py-12 sm:py-20">
          <p className="rubric">Questions</p>
          <h1 className="mt-4 max-w-2xl font-display text-3xl leading-tight sm:text-5xl">
            What has been asked, and what was answered
          </h1>
          <p className="mt-5 max-w-prose text-base text-slate sm:mt-6 sm:text-lg">
            Questions put by people in the circle, answered by the teacher and
            kept here afterwards. They are published without the name of whoever
            asked.
          </p>
        </section>

        {entries.length === 0 ? (
          <p className="max-w-prose border-y border-line py-8 text-slate">
            Nothing has been published here yet. Questions asked during the term
            are answered and collected on this page.
          </p>
        ) : (
          <>
            <QuestionList entries={entries} />
            {written.length > 0 ? (
              <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                  __html: JSON.stringify(structured).replace(/</g, "\\u003c"),
                }}
              />
            ) : null}
          </>
        )}

        <section
          id="ask"
          className="mt-12 border-t border-line pt-10 pb-16 sm:mt-16 sm:pt-12 sm:pb-20"
        >
          <p className="rubric">Ask</p>
          <h2 className="mt-3 max-w-2xl font-display text-2xl leading-tight sm:text-3xl">
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
