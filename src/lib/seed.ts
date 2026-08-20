import type { Program } from "./types";

/**
 * Placeholder content. Everything a visitor reads about the program lives in
 * this file until you add the same rows to Supabase — edit the text here to
 * see it on the site immediately, or run supabase/schema.sql and manage
 * programs in the Supabase table editor instead.
 */
export const SEED_PROGRAMS: Program[] = [
  {
    id: "00000000-0000-0000-0000-000000000001",
    slug: "mapping-the-divine",
    title: "Mapping the Divine",
    title_ar: null,
    tagline: "An 8-week journey into classical logic and sacred thought",
    term: "Starts mid-September 2026",
    lede: "Have you ever wondered how classical thinkers reasoned through life's deepest questions? How do we talk about existence, purpose, and reality using pure logic, without relying strictly on dogma?",
    summary:
      "Mapping the Divine is a 1-on-1 and group interactive course designed for anyone curious about the bridge between intellect and spirituality. Over eight weeks we work through the classical text known as The Mother of Proofs, a timeless masterpiece that uses formal logic to investigate the Divine and the human condition. Whether you are seeking to deepen your personal faith, explore classical philosophy, or simply engage with an ancient rational tradition in an open, welcoming environment, this workshop offers a space for meaningful conversation and critical inquiry.",
    format_note:
      "2 months · 16 sessions · 1.5 hours each · 24 hours in total · taken 1-on-1 or in a group",
    meeting_note:
      "Mid-September to mid-November 2026 · two sessions a week · days and times to be confirmed",
    location:
      "On Zoom, with two in-person meet-ups with the shaykh — one a month",
    fee_note: "To be confirmed",
    capacity: 20,
    registration_note: null,
    teacher_name: "Shaykh Zakaria AbdilAziz",
    teacher_bio:
      "Shaykh Zakaria AbdilAziz heads Muraqabah’s academic vision and is a graduate of the distinguished Alimiyyah program at Dar al-Mustafa in Tarim, Yemen, where he spent nearly two decades immersed in the traditional curriculum.",
    teacher_photo: "/shaykh-zakaria.webp",
    teacher_credentials: [
      "Graduate of the Alimiyyah program at Dar al-Mustafa, Tarim, Yemen",
      "Nearly two decades of traditional study under eminent scholars, including Habib Umar bin Hafiz",
      "Quran memorized in seven canonical recitations",
      "Formal authorizations (ijazat), including Hadith and Shafi’i jurisprudence",
    ],
    status: "open",
    explore: [
      {
        title: "The Tools of Logic",
        body: "Discover the three universal categories of reason and how they shape human understanding.",
      },
      {
        title: "The Nature of Existence",
        body: "Delve into how divine attributes such as eternity, unicity, and knowledge are articulated.",
      },
      {
        title: "Ethics & Revelation",
        body: "Examine the rational foundations behind moral responsibility.",
      },
      {
        title: "Open Dialogue",
        body: "Engage in weekly guided reflections connecting historical philosophy to modern questions of life.",
      },
    ],
    sessions: [
      {
        title: "Welcome & Orientation",
        note: "The essentials, and unpacking the art of inquiry and sacred philosophy",
        part: "Weeks 1–2",
        part_title: "The Foundations of Reason & Inquiry",
      },
      {
        title: "The Three Rulings of the Mind",
        note: "Necessary, impossible, and possible",
      },
      { title: "Moral Accountability & The Human Journey Toward Truth" },
      {
        title: "Reason & Tradition",
        note: "How ancient thinkers approached big questions",
      },
      { title: "The Concept of Existence", part: "Weeks 3–4" },
      {
        title: "Time and Timelessness",
        note: "Pre-eternity and continuity",
      },
      {
        title: "Transcending the Material World",
        note: "Distinctness and independence",
      },
      {
        title: "The Idea of Oneness",
        note: "Exploring unicity in classical thought",
      },
      { title: "Divine Will & Power", part: "Weeks 5–6" },
      { title: "Unlimited Knowledge" },
      {
        title: "Perception Beyond the Material",
        note: "Hearing and sight",
      },
      {
        title: "Perception Beyond the Material",
        note: "Speech",
      },
      {
        title: "The Harmony of Divine Attributes",
        note: "Understanding the quasi-attributes, and the role of guides and teachers in human history",
        part: "Weeks 7–8",
      },
      { title: "Miracles, Proofs, and the Validation of Truth" },
      {
        title: "The Core Message",
        note: "Distilling creed into everyday wisdom",
      },
      {
        title: "Closing Reflection",
        note: "Integrating reason, logic, and personal conviction",
      },
    ],
  },
];
