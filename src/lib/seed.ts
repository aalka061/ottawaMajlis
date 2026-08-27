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
      "Mapping the Divine is an interactive group course designed for anyone curious about the bridge between intellect and spirituality. Over eight weeks we work through al-‘Aqida al-Sanusiyya al-Sughra — the short creed of Imam Muhammad ibn Yusuf al-Sanusi, known everywhere as Umm al-Barahin, the Mother of Proofs — a timeless masterpiece that uses formal logic to investigate the Divine and the human condition. Whether you are seeking to deepen your personal faith, explore classical philosophy, or simply engage with an ancient rational tradition in an open, welcoming environment, this workshop offers a space for meaningful conversation and critical inquiry.",
    book_note:
      "al-‘Aqida al-Sanusiyya al-Sughra by Imam al-Sanusi — known as Umm al-Barahin, the Mother of Proofs",
    format_note: "2 months · 16 online sessions of 1 hour 15 minutes · 2 in-person sessions of 2 hours · 24 hours in total",
    meeting_note:
      "Mid-September to mid-November 2026 · Tuesdays and Thursdays · 8:45–10:00 pm ET",
    location: "Online, plus one in-person session per month",
    audience_note: "Open to all — recommended 16 and older",
    fee_note: "$150 for the whole course (2 months)",
    // An internal target for the size of the circle. Never shown to visitors:
    // registration stays open past it.
    capacity: 20,
    registration_note: null,
    teacher_name: "Shaykh Zakaria AbdilAziz",
    teacher_bio:
      "Shaykh Zakaria AbdilAziz heads Muraqabah’s academic vision and is a graduate of the distinguished Alimiyyah program at Dar al-Mustafa in Tarim, Yemen, where he spent nearly two decades immersed in the traditional curriculum.",
    teacher_photo: "/shaykh-zakaria.webp",
    teacher_url: "https://www.muraqabah.ca/",
    teacher_credentials: [
      "Graduate of the Alimiyyah program at Dar al-Mustafa, Tarim, Yemen",
      "Nearly two decades of traditional study under eminent scholars, including Habib Umar bin Hafiz",
      "Formal authorizations (ijazat), including Hadith and Shafi’i jurisprudence",
    ],
    status: "open",
    explore: [
      {
        title: "The Rulings of the Intellect",
        body: "Understanding the three fundamental rulings of the intellect:",
        items: [
          "Wajib — that which must be",
          "Mustahil — that which cannot be",
          "Ja’iz — that which may or may not be",
        ],
      },
      {
        title: "Knowing Allah",
        body: "An introduction to the rational obligation of knowing Allah and the proofs that establish His existence, perfection, and transcendence.",
      },
      {
        title: "The Divine Attributes",
        body: "Studying the necessary attributes of Allah ﷻ, including:",
        items: [
          "Existence",
          "Beginninglessness",
          "Everlastingness",
          "His non-resemblance to anything",
          "His Self-Sufficiency",
          "His Oneness",
        ],
        note: "And the remaining attributes traditionally studied within the science of Aqidah.",
      },
      {
        title: "The Attributes of Meaning",
        body: "Exploring Allah’s:",
        items: [
          "Power",
          "Will",
          "Knowledge",
          "Life",
          "Hearing",
          "Seeing",
          "Speech",
        ],
      },
      {
        title: "The Relationship Between Revelation and Reason",
        body: "Understanding the role of sound intellect and transmitted revelation in understanding matters of creed.",
      },
      {
        title: "Prophethood",
        body: "An introduction to the necessity of messengers, their attributes, their truthfulness, and the rational proofs establishing their mission.",
      },
      {
        title: "Miracles",
        body: "Understanding the meaning of a miracle and its role as a confirmation.",
      },
      {
        title: "Matters Known Through Revelation",
        body: "Lastly, an introduction to realities whose knowledge is established through revelation.",
      },
    ],
  },
];
