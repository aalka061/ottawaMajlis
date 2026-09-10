import { isSignedIn } from "@/lib/auth";
import {
  getPrograms,
  listPayments,
  listRegistrations,
  totalsByRegistration,
} from "@/lib/data";
import { settle } from "@/lib/money";
import { isSupabaseConfigured } from "@/lib/supabase";
import { statusLabel } from "@/lib/types";

function cell(value: string | null) {
  const text = value ?? "";
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export async function GET() {
  if (!(await isSignedIn())) {
    return new Response("Not signed in", { status: 401 });
  }
  if (!isSupabaseConfigured) {
    return new Response("Supabase is not configured", { status: 503 });
  }

  const [registrations, programs, payments] = await Promise.all([
    listRegistrations(),
    getPrograms(),
    listPayments(),
  ]);
  const titles = new Map(programs.map((p) => [p.id, p.title]));
  const fees = new Map(programs.map((p) => [p.id, p.fee_amount]));
  const paidByRow = totalsByRegistration(payments);
  const countByRow = payments.reduce(
    (counts, payment) =>
      counts.set(
        payment.registration_id,
        (counts.get(payment.registration_id) ?? 0) + 1,
      ),
    new Map<string, number>(),
  );

  // Plain numbers, not $150.00: this is a column somebody will sum in a
  // spreadsheet, and a currency symbol turns it into text there.
  const money = (amount: number | null) =>
    amount === null ? null : amount.toFixed(2);

  const header = [
    "name",
    "email",
    "phone",
    "program",
    "status",
    "heard_from",
    "their_note",
    "our_note",
    "registered_at",
    "fee",
    "amount_paid",
    "outstanding",
    "payments",
    "next_payment_due",
    "last_reminded_at",
  ];
  const rows = registrations.map((r) => {
    const stands = settle(
      paidByRow.get(r.id) ?? 0,
      fees.get(r.program_id) ?? null,
    );
    return [
      r.full_name,
      r.email,
      r.phone,
      titles.get(r.program_id) ?? r.program_id,
      statusLabel(r.status),
      r.heard_from,
      r.note,
      r.admin_note,
      r.created_at,
      money(stands.fee),
      money(stands.paid),
      money(stands.outstanding),
      String(countByRow.get(r.id) ?? 0),
      r.next_payment_due,
      r.payment_reminder_sent_at,
    ]
      .map(cell)
      .join(",");
  });

  const csv = [header.join(","), ...rows].join("\n");
  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="ottawa-majless-register-${stamp}.csv"`,
    },
  });
}
