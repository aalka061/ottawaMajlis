import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProgram } from "@/lib/data";
import { ProgramPage } from "@/components/ProgramPage";
import { SiteFooter } from "@/components/SiteChrome";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

/**
 * The public site is the one page at `/`. This address stays so the register
 * can look at a program that is not the one currently on the front — a draft,
 * or one that has closed — which is why it is kept out of search results.
 */
export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const program = await getProgram(slug);
  if (!program) return { title: "Program not found" };
  return {
    title: program.title,
    description: program.tagline,
    robots: { index: false, follow: false },
  };
}

export default async function ProgramPreviewPage({ params }: Params) {
  const { slug } = await params;
  const program = await getProgram(slug);
  if (!program) notFound();

  return (
    <>
      <ProgramPage program={program} />
      <SiteFooter />
    </>
  );
}
