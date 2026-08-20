import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProgram } from "@/lib/data";
import { MajlisRing } from "@/components/MajlisRing";
import { InterestForm } from "@/components/InterestForm";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import type { Session } from "@/lib/types";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const program = await getProgram(slug);
  if (!program) return { title: "Program not found" };
  return { title: program.title, description: program.tagline };
}

const STEPS = [
  {
    title: "Register your interest",
    body: "The form below. It takes a minute and costs nothing.",
  },
  {
    title: "We write to you",
    body: "Within a few days: the schedule, the Zoom link, whether you are joining a group or taking it 1-on-1, and the e-transfer details for the fee.",
  },
  {
    title: "Your place is held",
    body: "Once the fee arrives you are a member of the cohort and the place is yours for the eight weeks.",
  },
];

type Group = {
  part: string;
  partTitle?: string;
  items: { number: number; session: Session }[];
};

/** Sessions carry the part label that opens their group; fold them into it. */
function groupSessions(sessions: Session[]): Group[] {
  const groups: Group[] = [];
  sessions.forEach((session, i) => {
    if (session.part || groups.length === 0) {
      groups.push({
        part: session.part ?? "",
        partTitle: session.part_title,
        items: [],
      });
    }
    groups[groups.length - 1].items.push({ number: i + 1, session });
  });
  return groups;
}

export default async function ProgramPage({ params }: Params) {
  const { slug } = await params;
  const program = await getProgram(slug);
  if (!program) notFound();

  const open = program.status === "open";
  const groups = groupSessions(program.sessions);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-6">
        <section className="py-14 sm:py-20">
          <p className="rubric">{program.term}</p>
          <h1 className="mt-5 font-display text-[clamp(2.5rem,6vw,4.25rem)] leading-[1.05]">
            {program.title}
          </h1>
          {program.title_ar ? (
            <p className="mt-3 text-3xl text-brass">
              <span lang="ar">{program.title_ar}</span>
            </p>
          ) : null}
          <p className="mt-6 max-w-2xl text-xl text-slate">{program.tagline}</p>
        </section>

        {program.lede ? (
          <section className="border-y border-line py-12">
            <p className="max-w-3xl font-display text-[clamp(1.5rem,3vw,2.25rem)] leading-[1.35]">
              {program.lede}
            </p>
          </section>
        ) : null}

        <section className="grid gap-12 py-14 md:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="max-w-prose text-lg leading-relaxed">
              {program.summary}
            </p>
            <div className="mt-10">
              <p className="rubric">The details</p>
              <dl className="mt-5 divide-y divide-line border-y border-line">
                {[
                  ["Format", program.format_note],
                  ["When", program.meeting_note],
                  ["Where", program.location],
                  ["Fee", program.fee_note],
                  ["Group size", `${program.capacity} in the circle`],
                ].map(([label, value]) => (
                  <div key={label} className="grid gap-1 py-4 sm:grid-cols-[7rem_1fr]">
                    <dt className="field-label pt-1">{label}</dt>
                    <dd className="text-ink">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>

          <figure className="flex flex-col items-center md:pt-2">
            <MajlisRing capacity={program.capacity} centre="مجلس" size={280} />
          </figure>
        </section>

        {program.teacher_name ? (
          <section className="border-t border-line py-14">
            <p className="rubric">Who teaches it</p>
            <div
              className={`mt-8 grid gap-6 sm:items-start ${
                program.teacher_bio ? "sm:grid-cols-[16rem_1fr] sm:gap-8" : ""
              }`}
            >
              {program.teacher_photo ? (
                <div className="aspect-square w-full max-w-[16rem] overflow-hidden border border-line">
                  <Image
                    src={program.teacher_photo}
                    alt={program.teacher_name}
                    width={1280}
                    height={855}
                    sizes="(max-width: 640px) 100vw, 16rem"
                    className="h-full w-full object-cover"
                    priority={false}
                  />
                </div>
              ) : null}
              <div className={program.teacher_bio ? "sm:pt-1" : ""}>
                <h2 className="font-display text-3xl leading-tight">
                  {program.teacher_name}
                </h2>
                {program.teacher_bio ? (
                  <p className="mt-4 max-w-prose text-slate">
                    {program.teacher_bio}
                  </p>
                ) : null}
              </div>
            </div>
          </section>
        ) : null}

        {program.explore.length > 0 ? (
          <section className="border-t border-line py-14">
            <p className="rubric">What we will explore</p>
            <div className="mt-8 grid gap-x-12 gap-y-10 sm:grid-cols-2">
              {program.explore.map((item) => (
                <div key={item.title}>
                  <h2 className="font-display text-2xl leading-snug">
                    {item.title}
                  </h2>
                  <p className="mt-2 max-w-prose text-slate">{item.body}</p>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section className="border-t border-line py-14">
          <p className="rubric">The {program.sessions.length} sessions</p>
          <div className="mt-8 border-t border-line">
            {groups.map((group) => (
              <div key={group.part || "part"} className="grid gap-y-2 py-6 sm:grid-cols-[9rem_1fr]">
                <div className="sm:pt-4">
                  <p className="font-mono text-[0.6875rem] tracking-[0.14em] text-madder uppercase">
                    {group.part}
                  </p>
                  {group.partTitle ? (
                    <p className="mt-2 max-w-[8rem] font-display text-lg leading-snug text-slate">
                      {group.partTitle}
                    </p>
                  ) : null}
                </div>
                <ol className="divide-y divide-line border-y border-line">
                  {group.items.map(({ number, session }) => (
                    <li
                      key={number}
                      className="grid gap-1 py-4 sm:grid-cols-[3rem_1fr] sm:items-baseline"
                    >
                      <span className="font-mono text-sm text-brass">
                        {String(number).padStart(2, "0")}
                      </span>
                      <span>
                        <span className="font-display text-2xl leading-snug">
                          {session.title}
                        </span>
                        {session.note ? (
                          <span className="ml-3 text-slate">
                            — {session.note}
                          </span>
                        ) : null}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </section>

        <section id="register" className="border-t border-line py-14">
          <p className="rubric">Joining</p>
          <h2 className="mt-4 max-w-2xl font-display text-4xl leading-tight">
            {open
              ? "Three steps, and the first one is this page."
              : "Registration is closed."}
          </h2>

          {open ? (
            <>
              <ol className="mt-10 grid gap-8 sm:grid-cols-3">
                {STEPS.map((step, i) => (
                  <li key={step.title}>
                    <span className="font-mono text-sm text-brass">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <h3 className="mt-2 font-display text-2xl leading-snug">
                      {step.title}
                    </h3>
                    <p className="mt-2 text-slate">{step.body}</p>
                  </li>
                ))}
              </ol>

              <div className="mt-14">
                <InterestForm
                  programId={program.id}
                  programTitle={program.title}
                />
              </div>
            </>
          ) : (
            <p className="mt-4 max-w-prose text-slate">
              {program.registration_note ??
                "This course is no longer taking registrations. Write to ottawamajless@gmail.com to hear about the next cohort."}
            </p>
          )}
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
