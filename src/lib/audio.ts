/**
 * Where a recorded answer lives, and how to play it.
 *
 * Not server-only: the page that records an answer needs to play it back
 * before keeping it, and the page that shows one needs the same address.
 */

/** The Supabase Storage bucket recordings are kept in. Public to read. */
export const ANSWER_BUCKET = "answers";

/** Longer than this is a lesson, not an answer. */
export const LONGEST_RECORDING_SECONDS = 5 * 60;

/**
 * One format, everywhere. Browsers do not agree on what they record — Safari
 * gives back MP4, Chrome and Firefox give WebM/Opus, and an iPhone will not
 * play the latter — so whatever is recorded or chosen is re-encoded to MP3
 * before it is kept. MP3 plays in every browser there is.
 */
export const ANSWER_AUDIO_TYPE = "audio/mpeg";

/**
 * Where a recording can be played from.
 *
 * The column holds one of two things: a path inside our own bucket, or a whole
 * URL to a file hosted somewhere else. The first is what recording here
 * writes; the second is for a recording that already lives elsewhere.
 */
export function answerAudioUrl(value: string | null): string | null {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  return `${base.replace(/\/+$/, "")}/storage/v1/object/public/${ANSWER_BUCKET}/${value}`;
}

/** True for a path in our own bucket, as against a link to somewhere else. */
export function isStoredHere(value: string | null): value is string {
  return Boolean(value) && !/^https?:\/\//i.test(value as string);
}
