import type { Metadata } from "next";
import { getFeaturedProgram } from "@/lib/data";
import { ProgramPage } from "@/components/ProgramPage";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { CONTACT_EMAIL } from "@/lib/site";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const program = await getFeaturedProgram();
  if (!program) return {};
  return {
    title: { absolute: `${program.title} — Ottawa Majless` },
    description: program.tagline,
  };
}

/** The site is one page, and this is it: the program that is running. */
export default async function Home() {
  const program = await getFeaturedProgram();

  if (!program) {
    return (
      <>
        <SiteHeader />
        <main className="mx-auto max-w-5xl px-6">
          <section className="py-24">
            <p className="rubric">Ottawa</p>
            <h1 className="mt-5 max-w-2xl font-display text-[clamp(2.5rem,6vw,4.25rem)] leading-[1.05]">
              Nothing is running this term.
            </h1>
            <p className="mt-6 max-w-prose text-lg text-slate">
              The next program is announced a few weeks before it begins. Write
              to{" "}
              <a
                className="text-ink underline decoration-brass underline-offset-4 hover:text-madder"
                href={`mailto:${CONTACT_EMAIL}`}
              >
                {CONTACT_EMAIL}
              </a>{" "}
              and we will let you know when it opens.
            </p>
          </section>
        </main>
        <SiteFooter />
      </>
    );
  }

  return (
    <>
      <ProgramPage program={program} />
      <SiteFooter />
    </>
  );
}
