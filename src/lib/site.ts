/**
 * The one address the majless is reached at. It is also where the Interac
 * e-transfer goes, so it is named twice: the two uses are the same inbox today
 * but they are not the same thing, and only one of them should move if we ever
 * take payment somewhere else.
 */
export const CONTACT_EMAIL = "ottawamajless@gmail.com";
export const ETRANSFER_EMAIL = CONTACT_EMAIL;

/**
 * Where the site answers, for the letters that have to link back to it.
 *
 * Set NEXT_PUBLIC_SITE_URL once the majless has its own domain. On Vercel the
 * production host is known without being told, which covers a deploy nobody
 * has configured yet; a letter sent from a laptop links to that laptop, which
 * is wrong in the only way that cannot be mistaken for right.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000")
).replace(/\/+$/, "");
