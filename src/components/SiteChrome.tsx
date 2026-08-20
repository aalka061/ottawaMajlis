import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b border-line">
      <div className="mx-auto flex max-w-5xl items-baseline justify-between gap-6 px-6 py-5">
        <Link href="/" className="group flex items-baseline gap-3">
          <span className="font-display text-xl leading-none tracking-[0.16em] uppercase group-hover:text-madder sm:text-2xl">
            Ottawa Majlis
          </span>
          <span lang="ar" className="text-lg leading-none text-brass">
            مجلس أوتاوا
          </span>
        </Link>
        <nav className="font-mono text-[0.6875rem] tracking-[0.14em] uppercase">
          <Link href="/#programs" className="text-slate hover:text-madder">
            Programs
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-line">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-6 py-10 sm:flex-row sm:items-baseline sm:justify-between">
        <p className="max-w-sm text-sm text-slate">
          A small volunteer-run organisation in Ottawa. Write to us at{" "}
          <a
            className="text-ink underline decoration-brass underline-offset-4 hover:text-madder"
            href="mailto:ottawamajless@gmail.com"
          >
            ottawamajless@gmail.com
          </a>
          .
        </p>
        <p className="font-mono text-[0.6875rem] tracking-[0.14em] text-slate uppercase">
          Ottawa · Ontario
        </p>
      </div>
    </footer>
  );
}
