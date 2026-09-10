import "server-only";
import { Resend } from "resend";
import { formatMoney, type Settlement } from "./money";
import { CONTACT_EMAIL, ETRANSFER_EMAIL } from "./site";
import type { Payment, Program, Registration } from "./types";

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
 * A date as someone reads it: 12 Feb 2026. The column is a plain date with no
 * time in it, so it is read back at noon UTC rather than midnight — midnight
 * in UTC is the evening before in Ottawa, and a due date that shows a day
 * early is worse than useless.
 */
function readDate(isoDate: string) {
  return new Date(`${isoDate}T12:00:00Z`).toLocaleDateString("en-CA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * The two or three lines that say where someone's fee stands. Written the same
 * way in every letter that mentions money, so nobody has to reconcile two
 * different tellings of their own balance.
 *
 * A fee of null is a program with no amount set: what arrived is named, what
 * remains is not, because it is not known.
 */
function balanceLines(settlement: Settlement, nextDue: string | null) {
  const lines = [`Received so far: ${formatMoney(settlement.paid)}`];
  if (settlement.fee !== null) {
    lines.push(`The fee: ${formatMoney(settlement.fee)}`);
    if (settlement.outstanding !== null && settlement.outstanding > 0) {
      lines.push(`Still to come: ${formatMoney(settlement.outstanding)}`);
    }
  }
  if (nextDue) lines.push(`Next payment: ${readDate(nextDue)}`);
  return lines;
}

/**
 * The rule-topped block every one of these letters is built from: a small
 * caption and a run of lines under it. `rows` is HTML — most callers hand it
 * plain text through `block` below, and the ones with a mailto link in them
 * build their own spans.
 */
function rawBlock(heading: string, rows: string[]) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:28px 0 0;border-top:1px solid #dcd4c4;border-bottom:1px solid #dcd4c4;">
      <tr>
        <td style="padding:16px 0;font-size:16px;line-height:1.7;">
          <span style="display:block;font-family:ui-monospace,'SFMono-Regular',Menlo,monospace;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#5c6b63;padding-bottom:8px;">${escape(heading)}</span>
          ${rows.join("\n          ")}
        </td>
      </tr>
    </table>`;
}

/** One line of the block, as text. */
function row(line: string) {
  return `<span style="display:block;">${escape(line)}</span>`;
}

/** The same lines as a bordered block, for the HTML side. */
function block(heading: string, lines: string[]) {
  return rawBlock(heading, lines.map(row));
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

  const detail = [program.title, when, program.location].filter(
    (line): line is string => Boolean(line),
  );

  const html = `<div style="margin:0;padding:24px;background:#f4f1ea;font-family:Georgia,'Times New Roman',serif;color:#1f2a24;">
  <div style="max-width:34rem;margin:0 auto;background:#faf8f3;border:1px solid #c8a45c;padding:32px;">
    <p style="margin:0;font-family:ui-monospace,'SFMono-Regular',Menlo,monospace;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#9b2f2f;">Payment received</p>
    <p style="margin:20px 0 0;font-size:22px;line-height:1.4;">Assalamu alaikum ${escape(name)}, your place is reserved.</p>
    <p style="margin:20px 0 0;font-size:16px;line-height:1.6;">We have received your payment for ${escape(program.title)}. There is nothing further to send.</p>
    ${block("What you have secured", detail)}
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

/**
 * The nudge for someone whose fee has not arrived, in whole or in part. It
 * repeats the whole of what is being asked — the amount, the address, the
 * name in the message — because a reminder that only says "you have not paid"
 * makes the reader go and find the original mail.
 *
 * Someone part way through paying is asked for their balance and not for the
 * fee again: the amount named is what is actually outstanding, and what they
 * have already sent is named first, so the letter cannot read as though their
 * instalments went unnoticed.
 *
 * It ends by saying a transfer sent in the last day or two may have crossed
 * with it. Transfers land days after they are sent and the register is only
 * as current as the last time it was read, so some of these do go to people
 * who have already paid; saying so is what keeps that from being an accusation.
 */
export function paymentReminder(
  registration: Registration,
  program: Program,
  settlement: Settlement,
): Message {
  const name = firstName(registration.full_name);
  const partPaid = settlement.partial;

  // What to ask for: the balance when it is known, and otherwise the fee as
  // it is written on the program. Never both — two numbers in one letter is
  // how someone comes to send the wrong one.
  const asking =
    partPaid && settlement.outstanding !== null && settlement.outstanding > 0
      ? `${formatMoney(settlement.outstanding)}, the balance of your fee`
      : program.fee_note;

  const opening = partPaid
    ? `Thank you for what you have already sent towards ${program.title}. A balance is still standing, and a place is held once the whole of the fee has arrived.`
    : `You registered for ${program.title}, and we have not yet seen your payment arrive. A place is held once the fee does, so this is the one thing left to do.`;

  const sofar = partPaid
    ? balanceLines(settlement, registration.next_payment_due)
    : [];

  // The line that keeps this from being an accusation. Transfers land days
  // after they are sent, so some of these letters do reach someone who has
  // already paid — and for a part payer it is the balance they may have
  // just sent, not the fee.
  const crossed = partPaid
    ? "If you have already sent the rest, it has crossed with this note — nothing more is needed, and the confirmation follows once it lands."
    : "If you have already sent it, it has crossed with this note — nothing more is needed, and the confirmation follows once it lands.";

  const lines = [
    `Assalamu alaikum ${name},`,
    "",
    opening,
    ...(sofar.length > 0 ? ["", "Where it stands:", ...sofar.map((l) => `  ${l}`)] : []),
    "",
    partPaid ? "How to send the rest:" : "How to send it:",
    `  Interac e-transfer to ${ETRANSFER_EMAIL}`,
    ...(asking ? [`  ${asking}`] : []),
    "  Put your full name in the transfer message, so we can match it to your registration.",
    "",
    crossed,
    "",
    "If you would rather not carry on, reply to this and we will take your name off the register. No explanation needed.",
    "",
    "Ottawa Majless",
    CONTACT_EMAIL,
  ];

  const html = `<div style="margin:0;padding:24px;background:#f4f1ea;font-family:Georgia,'Times New Roman',serif;color:#1f2a24;">
  <div style="max-width:34rem;margin:0 auto;background:#faf8f3;border:1px solid #c8a45c;padding:32px;">
    <p style="margin:0;font-family:ui-monospace,'SFMono-Regular',Menlo,monospace;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#9b2f2f;">${partPaid ? "Balance outstanding" : "Payment outstanding"}</p>
    <p style="margin:20px 0 0;font-size:22px;line-height:1.4;">Assalamu alaikum ${escape(name)}, your place is not held yet.</p>
    <p style="margin:20px 0 0;font-size:16px;line-height:1.6;">${escape(opening)}</p>
    ${sofar.length > 0 ? block("Where it stands", sofar) : ""}
    ${rawBlock(partPaid ? "How to send the rest" : "How to send it", [
      `<span style="display:block;">Interac e-transfer to <a href="mailto:${ETRANSFER_EMAIL}" style="color:#9b2f2f;">${ETRANSFER_EMAIL}</a></span>`,
      ...(asking ? [row(asking)] : []),
      row(
        "Put your full name in the transfer message, so we can match it to your registration.",
      ),
    ])}
    <p style="margin:24px 0 0;font-size:16px;line-height:1.6;">${escape(crossed)}</p>
    <p style="margin:16px 0 0;font-size:16px;line-height:1.6;">If you would rather not carry on, reply to this and we will take your name off the register. No explanation needed.</p>
    <p style="margin:32px 0 0;font-size:14px;line-height:1.6;color:#5c6b63;">Ottawa Majless<br><a href="mailto:${CONTACT_EMAIL}" style="color:#9b2f2f;">${CONTACT_EMAIL}</a></p>
  </div>
</div>`;

  return {
    subject: partPaid
      ? `The balance of your fee for ${program.title}`
      : `Your place in ${program.title} is not held yet`,
    text: lines.join("\n"),
    html,
  };
}

/**
 * The receipt for an instalment: this much has arrived, this much remains,
 * and this is when the next one is expected. It is the letter that makes a
 * part payment a settled arrangement rather than an unanswered transfer.
 *
 * It is deliberately warm about what came and plain about what has not. The
 * thing it must never do is read as a demand — someone paying in instalments
 * has already done what was agreed, and the balance is a date in the diary,
 * not a debt being chased. The reminder is the letter that chases.
 */
export function partPaymentReceipt(
  registration: Registration,
  program: Program,
  payments: Payment[],
  settlement: Settlement,
): Message {
  const name = firstName(registration.full_name);
  const latest = payments[payments.length - 1];
  const nextDue = registration.next_payment_due;

  const opening = latest
    ? `We have received ${formatMoney(latest.amount)} towards ${program.title}. Thank you.`
    : `We have received your payment towards ${program.title}. Thank you.`;

  const closing = nextDue
    ? `The rest is expected by ${readDate(nextDue)}. Send it the same way — Interac e-transfer to ${ETRANSFER_EMAIL}, with your full name in the message. Your place is held once the fee is settled.`
    : `Send the rest whenever you are able — Interac e-transfer to ${ETRANSFER_EMAIL}, with your full name in the message. Your place is held once the fee is settled.`;

  const stands = balanceLines(settlement, nextDue);

  const lines = [
    `Assalamu alaikum ${name},`,
    "",
    opening,
    "",
    "Where it stands:",
    ...stands.map((line) => `  ${line}`),
    "",
    closing,
    "",
    "If the arrangement needs to change, reply to this and we will sort it out.",
    "",
    "Ottawa Majless",
    CONTACT_EMAIL,
  ];

  const html = `<div style="margin:0;padding:24px;background:#f4f1ea;font-family:Georgia,'Times New Roman',serif;color:#1f2a24;">
  <div style="max-width:34rem;margin:0 auto;background:#faf8f3;border:1px solid #c8a45c;padding:32px;">
    <p style="margin:0;font-family:ui-monospace,'SFMono-Regular',Menlo,monospace;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#9b2f2f;">Payment received</p>
    <p style="margin:20px 0 0;font-size:22px;line-height:1.4;">Assalamu alaikum ${escape(name)}, thank you.</p>
    <p style="margin:20px 0 0;font-size:16px;line-height:1.6;">${escape(opening)}</p>
    ${block("Where it stands", stands)}
    <p style="margin:24px 0 0;font-size:16px;line-height:1.6;">${escape(closing)}</p>
    <p style="margin:16px 0 0;font-size:16px;line-height:1.6;">If the arrangement needs to change, reply to this and we will sort it out.</p>
    <p style="margin:32px 0 0;font-size:14px;line-height:1.6;color:#5c6b63;">Ottawa Majless<br><a href="mailto:${CONTACT_EMAIL}" style="color:#9b2f2f;">${CONTACT_EMAIL}</a></p>
  </div>
</div>`;

  return {
    subject: `We have received your payment towards ${program.title}`,
    text: lines.join("\n"),
    html,
  };
}
