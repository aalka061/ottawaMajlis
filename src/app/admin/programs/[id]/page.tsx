import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { isSignedIn } from "@/lib/auth";
import { getProgramById } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/supabase";
import { ProgramForm } from "./ProgramForm";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export default async function EditProgramPage({ params }: Params) {
  if (!(await isSignedIn())) redirect("/admin/login");

  const { id } = await params;
  const program = isSupabaseConfigured ? await getProgramById(id) : null;
  if (!program) notFound();

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <Link
        href="/admin"
        className="font-mono text-[0.6875rem] tracking-[0.14em] text-slate uppercase hover:text-madder"
      >
        ← The register
      </Link>
      <div className="mt-6 flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <p className="rubric">The program</p>
          <h1 className="mt-3 font-display text-4xl leading-tight">
            {program.title}
          </h1>
        </div>
        <Link
          href={program.status === "open" ? "/" : `/programs/${program.slug}`}
          target="_blank"
          rel="noreferrer"
          className="btn btn-quiet"
        >
          See the page
        </Link>
      </div>
      <p className="mt-4 max-w-prose text-slate">
        Everything here is what a visitor reads, saved straight to the
        database. The site is a single page about whichever program is open,
        so setting this one to <strong>open</strong> puts it at{" "}
        <code className="font-mono text-sm">/</code>. Until then it can be read
        at <code className="font-mono text-sm">/programs/{program.slug}</code>,
        which is kept out of search results.
      </p>

      <div className="mt-12">
        <ProgramForm program={program} />
      </div>
    </main>
  );
}
