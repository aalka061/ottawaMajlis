import "server-only";
import { Resend } from "resend";
import { CONTACT_EMAIL } from "./site";
import type { Program, Registration } from "./types";

/**
 * Who the mail comes from. The majless has no domain of its own yet, so it
 * goes out over the one domain verified with Resend, and every reply is
 * pointed back at the inbox we actually read — the same one the e-transfers
 * arrive in. Give the majless its own domain and only EMAIL_FROM changes.
 */
const FROM = process.env.EMAIL_FROM ?? "Ottawa Majless <majless@techualize.com>";

/** True once the API key is set. Without it nothing is sent and we say so. */
export const isEmailConfigured = Boolean(process.env.RESEND_API_KEY);

let client: Resend | null = null;

function resend(): Resend {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not set.");
  if (!client) client = new Resend(key);
  return client;
}

export type Message = {
  subject: string;
  /** The mail as it reads with no styling at all. Never skip it. */
  text: string;
  html: string;
};

/**
 * The plumbing, kept apart from any particular message on purpose: a later
 * feature that writes to everyone on a program — schedule changes, the Zoom
 * link when it exists — composes its own Message and sends it through here.
 */
export async function sendEmail(to: string, message: Message) {
  const { error } = await resend().emails.send({
    from: FROM,
    to,
    replyTo: CONTACT_EMAIL,
    subject: message.subject,
    text: message.text,
    html: message.html,
  });
  if (error) throw new Error(error.message);
}

/** Text going into an HTML body. Program fields are typed by hand — escape. */
function escape(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** The first name alone, for a greeting. Falls back to the whole of it. */
function firstName(fullName: string) {
  return fullName.trim().split(/\s+/)[0] || fullName;
}

/**
 * The one email we send by hand: their money arrived, so their place is
 * theirs. It says what they have secured and what has not been sent yet, and
 * then it stops — nothing about what to do next, because there is nothing.
 */
export function paymentConfirmation(
  registration: Registration,
  program: Program,
): Message {
  const name = firstName(registration.full_name);
  const when = program.meeting_note;
  const materials =
    program.materials_note ||
    "The Zoom link and the course materials come to you closer to the start.";

  const lines = [
    `Assalamu alaikum ${name},`,
    "",
    `We have received your payment for ${program.title}, and your place is reserved. There is nothing further to send.`,
    "",
    "What you have secured:",
    `  ${program.title}`,
    ...(when ? [`  ${when}`] : []),
    ...(program.location ? [`  ${program.location}`] : []),
    "",
    materials,
    "",
    "Ottawa Majless",
    CONTACT_EMAIL,
  ];

  const detail = [program.title, when, program.location].filter(Boolean);

  const html = `<div style="margin:0;padding:24px;background:#f4f1ea;font-family:Georgia,'Times New Roman',serif;color:#1f2a24;">
  <div style="max-width:34rem;margin:0 auto;background:#faf8f3;border:1px solid #c8a45c;padding:32px;">
    <p style="margin:0;font-family:ui-monospace,'SFMono-Regular',Menlo,monospace;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#9b2f2f;">Payment received</p>
    <p style="margin:20px 0 0;font-size:22px;line-height:1.4;">Assalamu alaikum ${escape(name)}, your place is reserved.</p>
    <p style="margin:20px 0 0;font-size:16px;line-height:1.6;">We have received your payment for ${escape(program.title)}. There is nothing further to send.</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:28px 0 0;border-top:1px solid #dcd4c4;border-bottom:1px solid #dcd4c4;">
      <tr>
        <td style="padding:16px 0;font-size:16px;line-height:1.7;">
          <span style="display:block;font-family:ui-monospace,'SFMono-Regular',Menlo,monospace;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#5c6b63;padding-bottom:8px;">What you have secured</span>
          ${detail.map((line) => `<span style="display:block;">${escape(line as string)}</span>`).join("\n          ")}
        </td>
      </tr>
    </table>
    <p style="margin:24px 0 0;font-size:16px;line-height:1.6;">${escape(materials)}</p>
    <p style="margin:32px 0 0;font-size:14px;line-height:1.6;color:#5c6b63;">Ottawa Majless<br><a href="mailto:${CONTACT_EMAIL}" style="color:#9b2f2f;">${CONTACT_EMAIL}</a></p>
  </div>
</div>`;

  return {
    subject: `Your place in ${program.title} is reserved`,
    text: lines.join("\n"),
    html,
  };
}
