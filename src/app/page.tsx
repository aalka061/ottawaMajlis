import Link from "next/link";
import { getPrograms } from "@/lib/data";
import { MajlisRing } from "@/components/MajlisRing";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";

export const dynamic = "force-dynamic";

export default async function Home() {
  const all = await getPrograms();
  const programs = all.filter((p) => p.status === "open");

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-6">
        <section className="py-16 sm:py-24">
          <p className="rubric">Ottawa</p>
          <h1 className="mt-5 max-w-3xl font-display text-[clamp(2.5rem,6.5vw,4.5rem)] leading-[1.06]">
            One text, open between us, read slowly enough to argue with.
          </h1>
          <p className="mt-7 max-w-prose text-lg text-slate">
            Ottawa Majlis runs small programs where a classical text is studied
            a few pages at a time, in a circle — closer to a seminar than a
            lecture. Everything currently running is below.
          </p>
        </section>

        <section id="programs" className="border-t border-line py-14">
          <p className="rubric">Running now</p>

          {programs.length === 0 ? (
            <div className="mt-6 max-w-prose">
              <h2 className="font-display text-3xl leading-tight">
                Nothing is running this term.
              </h2>
              <p className="mt-4 text-slate">
                The next program is announced a few weeks before it begins.
                Write to{" "}
                <a
                  className="text-ink underline decoration-brass underline-offset-4 hover:text-madder"
                  href="mailto:ottawamajless@gmail.com"
                >
                  ottawamajless@gmail.com
                </a>{" "}
                and we will let you know when it opens.
              </p>
            </div>
          ) : (
            <ul className="mt-8 divide-y divide-line border-y border-line">
              {programs.map((program) => (
                <li key={program.id}>
                  <Link
                    href={`/programs/${program.slug}`}
                    className="group grid gap-8 py-10 sm:grid-cols-[1fr_11rem] sm:items-center"
                  >
                    <div>
                      <p className="font-mono text-[0.6875rem] tracking-[0.14em] text-brass uppercase">
                        {program.term}
                      </p>
                      <h2 className="mt-3 font-display text-4xl leading-tight group-hover:text-madder">
                        {program.title}
                        {program.title_ar ? (
                          <span lang="ar" className="ml-4 text-brass">
                            {program.title_ar}
                          </span>
                        ) : null}
                      </h2>
                      <p className="mt-3 max-w-prose text-slate">
                        {program.tagline}
                      </p>
                      {program.teacher_name ? (
                        <p className="mt-3 font-mono text-xs text-slate">
                          Taught by {program.teacher_name}
                        </p>
                      ) : null}
                      <p className="mt-5 font-mono text-[0.6875rem] tracking-[0.14em] text-madder uppercase">
                        Read the program →
                      </p>
                    </div>
                    <figure className="flex flex-col items-center gap-3">
                      <MajlisRing capacity={program.capacity} centre="" size={150} />
                      <figcaption className="font-mono text-[0.6875rem] tracking-[0.14em] text-slate uppercase">
                        {program.capacity} in the circle
                      </figcaption>
                    </figure>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="grid gap-10 py-14 md:grid-cols-3">
          <div>
            <h3 className="font-display text-2xl">How we read</h3>
            <p className="mt-3 text-slate">
              A few pages a session, read aloud and taken apart. Nobody is
              expected to have read ahead, and the questions matter more than
              the notes.
            </p>
          </div>
          <div>
            <h3 className="font-display text-2xl">Who comes</h3>
            <p className="mt-3 text-slate">
              People from across Ottawa, most with no formal study behind them.
              Come as you are; ask the question you think everyone else already
              knows the answer to.
            </p>
          </div>
          <div>
            <h3 className="font-display text-2xl">What it costs</h3>
            <p className="mt-3 text-slate">
              A fee for the full course, paid by e-transfer once we have
              written to you. Nothing is due at the moment you register.
            </p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
