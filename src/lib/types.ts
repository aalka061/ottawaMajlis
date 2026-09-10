export type RegistrationStatus =
  "interested" | "partial" | "confirmed" | "waitlist" | "withdrawn";

export const STATUS_ORDER: RegistrationStatus[] = [
  "interested",
  "partial",
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
 *
 * `partial` is the state a fee paid in instalments sits in: money has arrived,
 * a balance is still owed, and the place is not held until it is settled.
 * Recording a payment moves someone into and out of it on its own — the status
 * follows the money rather than being kept in step by hand.
 */
export const STATUS_LABEL: Record<RegistrationStatus, string> = {
  interested: "Registered — unpaid",
  partial: "Part paid — balance due",
  confirmed: "Paid — place held",
  waitlist: "Waitlist",
  withdrawn: "Withdrawn",
};

/** The two states that still owe money, and so can be reminded. */
export const OWING_STATUSES: RegistrationStatus[] = ["interested", "partial"];

export function isOwing(status: string): boolean {
  return OWING_STATUSES.includes(status as RegistrationStatus);
}

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
  /**
   * The fee as a number, beside the prose above. The prose is what the site
   * shows; this is what the register works balances out from. Null when no
   * amount has been set — then what has arrived is still known and what is
   * left is not, and nothing pretends otherwise.
   */
  fee_amount: number | null;
  /**
   * Read only in the payment confirmation email, never on the site: what
   * someone has not been sent yet, and roughly when it comes. It sits on the
   * program because it moves with the term, the way every other date does.
   */
  materials_note: string;
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
  /**
   * When the payment confirmation went out, null until it has. It is the
   * only record that it was sent; re-sending overwrites it with the later
   * time rather than keeping a history.
   */
  payment_email_sent_at: string | null;
  /**
   * When the last payment reminder went out, null until one has. Unlike the
   * confirmation this one is expected to be sent more than once, so the
   * column holds the latest time and the register shows it beside the button.
   */
  payment_reminder_sent_at: string | null;
  /**
   * When the last part-payment receipt went out, null until one has. Like the
   * reminder it may go once per instalment, so the column holds the latest.
   */
  part_payment_email_sent_at: string | null;
  /**
   * The day the next instalment is expected, as YYYY-MM-DD, null when none
   * is. It is an arrangement written down, not a rule: nothing enforces it
   * and nothing is sent on it. Reminders are still pressed by hand.
   */
  next_payment_due: string | null;
  created_at: string;
};

/**
 * One transfer that arrived. A fee settled in instalments is a list of these
 * rather than a running total: the total cannot say when the money came, and
 * a total typed over itself loses what it replaced.
 */
export type Payment = {
  id: string;
  registration_id: string;
  amount: number;
  /** The day the money landed, as YYYY-MM-DD — not the day it was recorded. */
  received_on: string;
  note: string | null;
  created_at: string;
};
