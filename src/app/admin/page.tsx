import Link from "next/link";
import { redirect } from "next/navigation";
import { isSignedIn } from "@/lib/auth";
import { getPrograms, listRegistrations } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/supabase";
import { STATUS_LABEL, STATUS_ORDER, type RegistrationStatus } from "@/lib/types";
import { signOut, updateRegistration } from "./actions";

export const dynamic = "force-dynamic";

const STATUS_TONE: Record<RegistrationStatus, string> = {
  interested: "border-brass text-brass",
  contacted: "border-slate text-slate",
  confirmed: "border-madder bg-madder text-paper",
  waitlist: "border-slate text-slate",
  withdrawn: "border-line text-slate line-through",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-CA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function AdminPage() {
  if (!(await isSignedIn())) redirect("/admin/login");

  if (!isSupabaseConfigured) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-20">
        <p className="rubric">Register</p>
        <h1 className="mt-4 font-display text-4xl leading-tight">
          The database is not connected.
        </h1>
        <p className="mt-4 text-slate">
          Run <code className="font-mono text-sm">supabase/schema.sql</code> in
          your Supabase project, then put{" "}
          <code className="font-mono text-sm">NEXT_PUBLIC_SUPABASE_URL</code>{" "}
          and{" "}
          <code className="font-mono text-sm">SUPABASE_SERVICE_ROLE_KEY</code>{" "}
          in your environment. Registrations appear here as soon as they can be
          saved.
        </p>
      </main>
    );
  }

  const [registrations, programs] = await Promise.all([
    listRegistrations(),
    getPrograms(),
  ]);
  const programTitle = new Map(programs.map((p) => [p.id, p.title]));

  const counts = STATUS_ORDER.map((status) => ({
    status,
    count: registrations.filter((r) => r.status === status).length,
  }));

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <p className="rubric">Ottawa Majlis</p>
          <h1 className="mt-3 font-display text-4xl leading-tight">
            The register
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/admin/export" className="btn btn-quiet">
            Export CSV
          </Link>
          <form action={signOut}>
            <button type="submit" className="btn btn-quiet">
              Sign out
            </button>
          </form>
        </div>
      </div>

      <dl className="mt-10 grid grid-cols-2 gap-px border border-line bg-line sm:grid-cols-5">
        {counts.map(({ status, count }) => (
          <div key={status} className="bg-paper px-4 py-5">
            <dt className="field-label">{STATUS_LABEL[status]}</dt>
            <dd className="mt-2 font-mono text-3xl">{count}</dd>
          </div>
        ))}
      </dl>

      {registrations.length === 0 ? (
        <p className="mt-12 text-slate">
          Nobody has registered yet. Registrations land here the moment someone
          submits the form.
        </p>
      ) : (
        <ul className="mt-12 divide-y divide-line border-y border-line">
          {registrations.map((r) => (
            <li key={r.id} className="grid gap-6 py-7 md:grid-cols-[1.1fr_0.9fr]">
              <div>
                <div className="flex flex-wrap items-baseline gap-3">
                  <h2 className="font-display text-2xl leading-none">
                    {r.full_name}
                  </h2>
                  <span
                    className={`border px-2 py-0.5 font-mono text-[0.625rem] tracking-[0.14em] uppercase ${STATUS_TONE[r.status]}`}
                  >
                    {STATUS_LABEL[r.status]}
                  </span>
                </div>
                <p className="mt-3 font-mono text-sm">
                  <a
                    href={`mailto:${r.email}`}
                    className="underline decoration-brass underline-offset-4 hover:text-madder"
                  >
                    {r.email}
                  </a>
                  {r.phone ? <span className="text-slate"> · {r.phone}</span> : null}
                </p>
                <p className="mt-2 font-mono text-xs text-slate">
                  {programTitle.get(r.program_id) ?? "Unknown program"} ·
                  registered {formatDate(r.created_at)}
                  {r.heard_from ? ` · heard via ${r.heard_from}` : ""}
                </p>
                {r.note ? (
                  <p className="mt-3 max-w-prose border-l-2 border-line pl-3 text-sm text-slate">
                    {r.note}
                  </p>
                ) : null}
              </div>

              <form action={updateRegistration} className="grid gap-3">
                <input type="hidden" name="id" value={r.id} />
                <div>
                  <label className="field-label" htmlFor={`status-${r.id}`}>
                    Status
                  </label>
                  <select
                    id={`status-${r.id}`}
                    name="status"
                    defaultValue={r.status}
                    className="field-input mt-2"
                  >
                    {STATUS_ORDER.map((status) => (
                      <option key={status} value={status}>
                        {STATUS_LABEL[status]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="field-label" htmlFor={`note-${r.id}`}>
                    Your note
                  </label>
                  <input
                    id={`note-${r.id}`}
                    name="admin_note"
                    defaultValue={r.admin_note ?? ""}
                    className="field-input mt-2"
                    placeholder="e-transfer received 12 Jan"
                  />
                </div>
                <button type="submit" className="btn btn-quiet justify-self-start">
                  Save
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
