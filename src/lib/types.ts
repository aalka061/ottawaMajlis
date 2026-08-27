export type RegistrationStatus =
  "interested" | "confirmed" | "waitlist" | "withdrawn";

export const STATUS_ORDER: RegistrationStatus[] = [
  "interested",
  "confirmed",
  "waitlist",
  "withdrawn",
];

/**
 * What each state is called everywhere a person reads it. `interested` is the
 * value the database has always stored for a fresh sign-up; nobody registers
 * their interest any more, they register and then pay, so it reads as
 * "Registered — unpaid". There used to be a `contacted` state between the two,
 * from when we messaged people to ask for the fee; `0004_payment_confirms.sql`
 * folds any of those rows back into `interested`.
 */
export const STATUS_LABEL: Record<RegistrationStatus, string> = {
  interested: "Registered — unpaid",
  confirmed: "Paid — place held",
  waitlist: "Waitlist",
  withdrawn: "Withdrawn",
};

/** Tolerates a row written before a status was retired. */
export function statusLabel(status: string): string {
  return STATUS_LABEL[status as RegistrationStatus] ?? "Registered — unpaid";
}

export type ExploreItem = {
  title: string;
  body: string;
  /**
   * Set under the body as a list — the named things a topic covers, e.g. the
   * three rulings of the intellect, or the attributes of meaning.
   */
  items?: string[];
  /** A closing line after that list, for what it does not name outright. */
  note?: string;
};

export type Program = {
  id: string;
  slug: string;
  title: string;
  title_ar: string | null;
  tagline: string;
  term: string;
  /** The question the program opens with, set large above the summary. */
  lede: string | null;
  summary: string;
  /** The text being read, shown as the first row of the details. */
  book_note: string;
  format_note: string;
  meeting_note: string;
  location: string;
  /** Who may come, e.g. "Open to all — recommended 16 and older". */
  audience_note: string;
  fee_note: string;
  capacity: number;
  registration_note: string | null;
  teacher_name: string | null;
  teacher_bio: string | null;
  teacher_photo: string | null;
  /** Where the teacher’s own work lives, linked from their name. */
  teacher_url: string | null;
  teacher_credentials: string[];
  status: "draft" | "open" | "closed";
  explore: ExploreItem[];
};

export type Registration = {
  id: string;
  program_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  heard_from: string | null;
  note: string | null;
  status: RegistrationStatus;
  admin_note: string | null;
  created_at: string;
};
