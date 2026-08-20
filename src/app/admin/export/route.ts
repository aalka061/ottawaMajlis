import { isSignedIn } from "@/lib/auth";
import { getPrograms, listRegistrations } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/supabase";

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

  const [registrations, programs] = await Promise.all([
    listRegistrations(),
    getPrograms(),
  ]);
  const titles = new Map(programs.map((p) => [p.id, p.title]));

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
  ];
  const rows = registrations.map((r) =>
    [
      r.full_name,
      r.email,
      r.phone,
      titles.get(r.program_id) ?? r.program_id,
      r.status,
      r.heard_from,
      r.note,
      r.admin_note,
      r.created_at,
    ]
      .map(cell)
      .join(","),
  );

  const csv = [header.join(","), ...rows].join("\n");
  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="ottawa-majlis-register-${stamp}.csv"`,
    },
  });
}
