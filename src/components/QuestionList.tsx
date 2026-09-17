"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

export type Entry = {
  id: string;
  question: string;
  answer: string;
  /** The program and the session, already joined for the caption line. */
  about: string;
  answered: string;
  audio: string | null;
  audioSeconds: number | null;
};

/**
 * The address bar's fragment, read the way React wants a browser thing read:
 * empty on the server, the real one after hydration, and updated when someone
 * follows a link to another answer on a page they are already on.
 */
function useHash() {
  return useSyncExternalStore(
    (change) => {
      window.addEventListener("hashchange", change);
      return () => window.removeEventListener("hashchange", change);
    },
    () => window.location.hash,
    () => "",
  );
}

function minutes(seconds: number) {
  if (seconds < 60) return `${seconds} sec`;
  return `${Math.round(seconds / 60)} min`;
}

/** A small mark saying an answer is spoken, and how long it runs. */
function Spoken({ seconds }: { seconds: number | null }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 border border-brass px-2 py-0.5 font-mono text-[0.625rem] tracking-[0.14em] text-brass uppercase">
      <svg
        viewBox="0 0 12 12"
        aria-hidden="true"
        className="h-2.5 w-2.5 fill-current"
      >
        <path d="M6 1 3.2 3.4H1v5.2h2.2L6 11V1Z" />
        <path
          d="M8.2 3.6a3.4 3.4 0 0 1 0 4.8M9.9 1.9a5.8 5.8 0 0 1 0 8.2"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          strokeLinecap="round"
        />
      </svg>
      Spoken{seconds ? ` · ${minutes(seconds)}` : ""}
    </span>
  );
}

/** The answer as written, one paragraph per blank line. */
function Answer({ text }: { text: string }) {
  return (
    <>
      {text
        .split(/\n\s*\n/)
        .map((part) => part.trim())
        .filter(Boolean)
        .map((part, i) => (
          <p
            key={i}
            className="mt-4 max-w-prose [overflow-wrap:anywhere] whitespace-pre-line first:mt-0"
          >
            {part}
          </p>
        ))}
    </>
  );
}

/** Copies the address of one answer, for sending to the next person to ask. */
function CopyLink({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        const link = `${window.location.origin}${window.location.pathname}#q-${id}`;
        try {
          await navigator.clipboard.writeText(link);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          // Clipboard refused — the address bar still holds the link once the
          // answer is open, so there is nothing to apologise for.
          window.location.hash = `q-${id}`;
        }
      }}
      className="font-mono text-[0.6875rem] tracking-[0.14em] text-slate uppercase hover:text-madder"
    >
      {copied ? "Link copied" : "Copy link"}
    </button>
  );
}

/**
 * The archive, and a box to search it with.
 *
 * Everything is on the page already, so searching is a filter rather than a
 * request: nothing is fetched, nothing waits, and a term with a hundred
 * questions is still one page. Past that it would want paging — which is a
 * good problem and not this year's.
 */
export function QuestionList({ entries }: { entries: Entry[] }) {
  const [query, setQuery] = useState("");
  const [opened, setOpened] = useState<Record<string, boolean>>({});
  const hash = useHash();
  const linked = hash.startsWith("#q-") ? hash.slice(3) : null;
  const scrolled = useRef<string | null>(null);

  // A link to one answer opens on that answer. Hydration happens after the
  // browser has given up looking for the anchor, so the scroll is done here.
  useEffect(() => {
    if (!linked || scrolled.current === linked) return;
    scrolled.current = linked;
    document
      .getElementById(`q-${linked}`)
      ?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [linked]);

  const needle = query.trim().toLowerCase();
  const shown = needle
    ? entries.filter((entry) =>
        `${entry.question} ${entry.answer} ${entry.about}`
          .toLowerCase()
          .includes(needle),
      )
    : entries;

  // With two or three on the page there is nothing to scan, so they are open.
  const few = entries.length <= 3;

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <label className="field-label" htmlFor="q-search">
          Search the questions
        </label>
        <p className="font-mono text-[0.6875rem] tracking-[0.14em] text-slate uppercase">
          {needle
            ? `${shown.length} of ${entries.length}`
            : `${entries.length} ${entries.length === 1 ? "question" : "questions"}`}
        </p>
      </div>
      <input
        id="q-search"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="A word in the question or the answer"
        className="field-input mt-2"
      />

      {shown.length === 0 ? (
        <p className="mt-8 max-w-prose border-y border-line py-8 text-slate">
          Nothing here matches that. Try a plainer word — or ask it yourself
          below, if it has not been asked.
        </p>
      ) : (
        <div className="mt-8 divide-y divide-line border-y border-line">
          {shown.map((entry) => {
            const open =
              opened[entry.id] ?? (linked === entry.id || few || Boolean(needle));
            return (
              <details
                key={entry.id}
                id={`q-${entry.id}`}
                open={open}
                onToggle={(event) => {
                  // Read now, not inside the updater: React clears an event's
                  // currentTarget once the handler returns, and a functional
                  // update runs later, on the next render.
                  const isOpen = (event.target as HTMLDetailsElement).open;
                  setOpened((was) =>
                    was[entry.id] === isOpen
                      ? was
                      : { ...was, [entry.id]: isOpen },
                  );
                }}
                className="group scroll-mt-24 py-5"
              >
                <summary className="flex cursor-pointer list-none items-baseline gap-3 select-none sm:gap-4 [&::-webkit-details-marker]:hidden">
                  <span className="mt-1 shrink-0 font-mono text-sm text-brass transition-colors group-open:text-madder">
                    <span className="group-open:hidden">+</span>
                    <span className="hidden group-open:inline">−</span>
                  </span>
                  <span className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-2">
                    <span className="min-w-0 font-display text-lg leading-snug [overflow-wrap:anywhere] group-hover:text-madder sm:text-xl">
                      {entry.question}
                    </span>
                    {entry.audio ? (
                      <Spoken seconds={entry.audioSeconds} />
                    ) : null}
                  </span>
                </summary>

                <div className="mt-4 min-w-0 sm:pl-8">
                  <div className="text-slate">
                    <Answer text={entry.answer} />
                  </div>

                  {entry.audio ? (
                    <div className="mt-5 border-y border-line py-4">
                      <p className="field-label">Heard instead</p>
                      <audio
                        controls
                        preload="none"
                        src={entry.audio}
                        className="mt-2 block w-full max-w-full"
                      >
                        <a href={entry.audio}>Download the recording</a>
                      </audio>
                    </div>
                  ) : null}

                  <div className="mt-4 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
                    <p className="font-mono text-[0.6875rem] tracking-[0.14em] text-slate uppercase">
                      {entry.about ? `${entry.about} · ` : ""}
                      Answered {entry.answered}
                    </p>
                    <CopyLink id={entry.id} />
                  </div>
                </div>
              </details>
            );
          })}
        </div>
      )}
    </div>
  );
}
