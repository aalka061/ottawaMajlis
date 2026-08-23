import Link from "next/link";

export type NavLink = { href: string; label: string };

/**
 * The page is about the program, so the header leads with the program and
 * keeps Ottawa Majless to a small mark on the left: the house, not the subject.
 */
export function SiteHeader({ links = [] }: { links?: NavLink[] }) {
  return (
    <header className="sticky top-0 z-10 border-b border-line bg-stone/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-wrap items-baseline justify-between gap-x-6 gap-y-2 px-6 py-4">
        <Link href="/" className="group flex items-baseline gap-3">
          <span className="font-mono text-[0.6875rem] tracking-[0.16em] text-slate uppercase group-hover:text-madder">
            Ottawa Majless
          </span>
          <span lang="ar" className="text-sm leading-none text-brass">
            مجلس أوتاوا
          </span>
        </Link>
        {links.length > 0 ? (
          <nav className="flex flex-wrap items-baseline gap-x-5 gap-y-1 font-mono text-[0.6875rem] tracking-[0.14em] uppercase">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className={
                  link.href === "#register"
                    ? "text-madder hover:text-ink"
                    : "text-slate hover:text-madder"
                }
              >
                {link.label}
              </a>
            ))}
          </nav>
        ) : null}
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-line">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-6 py-10 sm:flex-row sm:items-baseline sm:justify-between">
        <p className="max-w-sm text-sm text-slate">
          Held by Ottawa Majless, a small volunteer-run circle. Write to us at{" "}
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
