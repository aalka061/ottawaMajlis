import Image from "next/image";
import { MajlisRing } from "@/components/MajlisRing";
import { RegisterForm } from "@/components/RegisterForm";
import { SiteHeader, type NavLink } from "@/components/SiteChrome";
import { CONTACT_EMAIL, ETRANSFER_EMAIL } from "@/lib/site";
import type { Program } from "@/lib/types";

/**
 * The one thing said about the size of the group, in the three places a
 * visitor meets it: beside the circle, among the facts of the course, and at
 * the moment they decide. Deliberately no number — the circle is a target we
 * have registered past before, and naming a count would make it a promise.
 * How many people have registered is still never shown.
 */
const SCARCITY = {
  ring: "Places are limited",
  detail: "Limited — the circle closes when they are taken",
  joining:
    "Places are limited, and it is the e-transfer that holds one — earlier is safer than later.",
};

/**
 * Two steps, not three. Payment is what holds the place, so there is no round
 * of messages in the middle asking for it. Step two carries the amount and the
 * address outright — that is everything someone needs to decide, and it saves
 * repeating the full e-transfer panel above a form they have not filled yet.
 */
function steps(program: Program) {
  const fee = program.fee_note ? `${program.fee_note}, by` : "The fee, by";
  return [
    {
      title: "Register",
      body: "The form below — your name, an email, and a WhatsApp number. It takes a minute and tells us who the transfer belongs to.",
    },
    {
      title: "Send the e-transfer",
      body: `${fee} Interac e-transfer to ${ETRANSFER_EMAIL}. That is what holds your place: the moment it arrives you are a member of the cohort.`,
    },
  ];
}

/** "https://www.muraqabah.ca/" reads as "muraqabah.ca" on the page. */
function siteLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/**
 * The whole site, as one page about one program. Ottawa Majless is the house
 * the program is held in, so it stays in the margins: the mark in the header
 * and the footer, and nowhere in the body.
 */
export function ProgramPage({ program }: { program: Program }) {
  const open = program.status === "open";
  const hasTeacherDetail =
    Boolean(program.teacher_bio) ||
    Boolean(program.teacher_url) ||
    program.teacher_credentials.length > 0;

  const links: NavLink[] = [
    { href: "#course", label: "The course" },
    ...(program.explore.length > 0
      ? [{ href: "#study", label: "What we study" }]
      : []),
    ...(program.teacher_name
      ? [{ href: "#teacher", label: "Who teaches" }]
      : []),
    ...(open ? [{ href: "#register", label: "Register" }] : []),
  ];

  return (
    <>
      <SiteHeader links={links} />
      <main className="mx-auto max-w-5xl px-6">
        <section className="grid gap-12 py-14 sm:py-20 md:grid-cols-[1.15fr_0.85fr] md:items-center">
          <div>
            <p className="rubric">{program.term}</p>
            <h1 className="mt-5 font-display text-[clamp(2.5rem,6vw,4.25rem)] leading-[1.05]">
              {program.title}
            </h1>
            {program.title_ar ? (
              <p className="mt-3 text-3xl text-brass">
                <span lang="ar">{program.title_ar}</span>
              </p>
            ) : null}
            <p className="mt-6 max-w-2xl text-xl text-slate">
              {program.tagline}
            </p>
            {program.teacher_name ? (
              <p className="mt-5 font-mono text-xs tracking-[0.08em] text-slate">
                Taught by {program.teacher_name}
              </p>
            ) : null}
            {open ? (
              <p className="mt-9">
                <a href="#register" className="btn">
                  Register for the course
                </a>
              </p>
            ) : null}
          </div>

          <figure className="flex flex-col items-center md:justify-self-end">
            <MajlisRing capacity={program.capacity} centre="مجلس" size={280} />
            {open ? (
              <figcaption className="mt-5 font-mono text-[0.6875rem] tracking-[0.14em] text-madder uppercase">
                {SCARCITY.ring}
              </figcaption>
            ) : null}
          </figure>
        </section>

        {program.lede ? (
          <section className="border-y border-line py-12">
            <p className="max-w-3xl font-display text-[clamp(1.5rem,3vw,2.25rem)] leading-[1.35]">
              {program.lede}
            </p>
          </section>
        ) : null}

        <section id="course" className="scroll-mt-24 py-14">
          <p className="rubric">The course</p>
          <div className="mt-8 grid gap-12 md:grid-cols-[1.1fr_0.9fr]">
            <p className="max-w-prose text-lg leading-relaxed">
              {program.summary}
            </p>
            <div>
              <dl className="divide-y divide-line border-y border-line">
                {[
                  ["Book", program.book_note],
                  ["Format", program.format_note],
                  ["When", program.meeting_note],
                  ["Where", program.location],
                  ["Who", program.audience_note],
                  ["Fee", program.fee_note],
                  ...(open ? [["Places", SCARCITY.detail]] : []),
                ]
                  .filter(([, value]) => value)
                  .map(([label, value]) => (
                    <div
                      key={label}
                      className="grid gap-1 py-4 sm:grid-cols-[5rem_1fr]"
                    >
                      <dt className="field-label pt-1">{label}</dt>
                      <dd className="text-ink">{value}</dd>
                    </div>
                  ))}
              </dl>
            </div>
          </div>
        </section>

        {program.explore.length > 0 ? (
          <section
            id="study"
            className="scroll-mt-24 border-t border-line py-14"
          >
            <p className="rubric">What we will study</p>
            <ol className="mt-8 grid gap-x-12 gap-y-10 sm:grid-cols-2">
              {program.explore.map((item, i) => (
                <li key={item.title}>
                  <span className="font-mono text-sm text-brass">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h2 className="mt-2 font-display text-2xl leading-snug">
                    {item.title}
                  </h2>
                  <p className="mt-2 max-w-prose text-slate">{item.body}</p>
                  {item.items && item.items.length > 0 ? (
                    <ul className="mt-3 max-w-prose space-y-1.5 text-slate">
                      {item.items.map((entry) => (
                        <li key={entry} className="flex gap-3">
                          <span aria-hidden="true" className="text-brass">
                            —
                          </span>
                          <span>{entry}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {item.note ? (
                    <p className="mt-3 max-w-prose text-slate">{item.note}</p>
                  ) : null}
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        {program.teacher_name ? (
          <section
            id="teacher"
            className="scroll-mt-24 border-t border-line py-14"
          >
            <p className="rubric">Who teaches it</p>
            <div
              className={`mt-8 grid gap-6 sm:items-start ${
                hasTeacherDetail ? "sm:grid-cols-[16rem_1fr] sm:gap-10" : ""
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
              <div className={hasTeacherDetail ? "sm:pt-1" : ""}>
                <h2 className="font-display text-3xl leading-tight">
                  {program.teacher_name}
                </h2>
                {program.teacher_bio ? (
                  <p className="mt-4 max-w-prose text-slate">
                    {program.teacher_bio}
                  </p>
                ) : null}
                {program.teacher_url ? (
                  <p className="mt-4">
                    <a
                      href={program.teacher_url}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-[0.6875rem] tracking-[0.14em] text-madder uppercase hover:text-ink"
                    >
                      {siteLabel(program.teacher_url)} →
                    </a>
                  </p>
                ) : null}
                {program.teacher_credentials.length > 0 ? (
                  <ul className="mt-6 max-w-prose divide-y divide-line border-y border-line">
                    {program.teacher_credentials.map((credential) => (
                      <li key={credential} className="py-3 text-slate">
                        {credential}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </div>
          </section>
        ) : null}

        <section
          id="register"
          className="scroll-mt-24 border-t border-line py-14"
        >
          <p className="rubric">Joining</p>
          <h2 className="mt-4 max-w-2xl font-display text-4xl leading-tight">
            {open
              ? "Two steps, and the place is yours."
              : "Registration is closed."}
          </h2>

          {open ? (
            <>
              <p className="mt-4 max-w-2xl text-lg text-slate">
                {SCARCITY.joining}
              </p>

              <ol className="mt-10 grid gap-8 sm:grid-cols-2">
                {steps(program).map((step, i) => (
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

              <div className="mt-12">
                <RegisterForm
                  programId={program.id}
                  programTitle={program.title}
                  feeNote={program.fee_note}
                />
              </div>
            </>
          ) : (
            <p className="mt-4 max-w-prose text-slate">
              {program.registration_note ??
                `This course is no longer taking registrations. Write to ${CONTACT_EMAIL} to hear about the next cohort.`}
            </p>
          )}
        </section>
      </main>
    </>
  );
}
