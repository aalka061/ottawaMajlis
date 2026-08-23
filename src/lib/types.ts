export type RegistrationStatus =
  | "interested"
  | "contacted"
  | "confirmed"
  | "waitlist"
  | "withdrawn";

export const STATUS_ORDER: RegistrationStatus[] = [
  "interested",
  "contacted",
  "confirmed",
  "waitlist",
  "withdrawn",
];

/**
 * What each state is called everywhere a person reads it. `interested` is the
 * value the database has always stored for a fresh sign-up; nobody registers
 * their interest any more, they register, so it reads as "Registered".
 */
export const STATUS_LABEL: Record<RegistrationStatus, string> = {
  interested: "Registered",
  contacted: "Contacted",
  confirmed: "Paid — member",
  waitlist: "Waitlist",
  withdrawn: "Withdrawn",
};

export type Session = {
  title: string;
  note?: string;
  /** Set on the session that opens a new part, e.g. "Weeks 1–2". */
  part?: string;
  /** Optional name for that part. */
  part_title?: string;
};

export type ExploreItem = {
  title: string;
  body: string;
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
  sessions: Session[];
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
