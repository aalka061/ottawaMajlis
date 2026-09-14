"use client";

import Link from "next/link";
import { useState } from "react";
import { formatMoney } from "@/lib/money";
import {
  STATUS_LABEL,
  STATUS_ORDER,
  type RegistrationStatus,
} from "@/lib/types";

function today() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * The status and the note on one row, and — only where it means something — the
 * day the money landed.
 *
 * Marking someone paid records their balance as a transfer, so the register
 * needs a date for it. Taking today is right nearly every time and wrong in a
 * way nobody would notice for a month: a transfer that arrived on Tuesday and
 * was written down on Friday is filed under Friday, and the row that says which
 * day the money came is the one you go looking for when a transfer is disputed.
 *
 * So the field asks, and it only appears once Paid is actually chosen on a row
 * that has a balance to settle. Every other row is the plain status and note it
 * was before — which is the whole reason this is a client component: on the
 * server the field would have to sit on all of them, always, for the sake of
 * the one press in ten that needs it.
 */
export function StatusForm({
  registrationId,
  status,
  adminNote,
  outstanding,
  action,
}: {
  registrationId: string;
  status: RegistrationStatus;
  adminNote: string | null;
  /**
   * What marking them paid would record, or null when nothing would be — an
   * already settled fee, or a program with no fee amount to work from. Null
   * keeps the date field away, because there would be no transfer to date.
   */
  outstanding: number | null;
  action: (formData: FormData) => Promise<void>;
}) {
  const settled = STATUS_ORDER.includes(status) ? status : "interested";
  const [picked, setPicked] = useState<RegistrationStatus>(settled);

  // Nothing is recorded when they are already paid, so nothing needs dating.
  const willRecord =
    picked === "confirmed" &&
    status !== "confirmed" &&
    outstanding !== null &&
    outstanding > 0;

  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="id" value={registrationId} />
      <div>
        <label className="field-label" htmlFor={`status-${registrationId}`}>
          Status
        </label>
        <select
          id={`status-${registrationId}`}
          name="status"
          value={picked}
          onChange={(e) => setPicked(e.target.value as RegistrationStatus)}
          className="field-input mt-2"
        >
          {STATUS_ORDER.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
        <p className="mt-1.5 max-w-prose text-sm text-slate">
          Set this as the money arrives. Paid holds their place and writes the
          balance down as a transfer, so a fee sent in one go needs nothing
          else. Part paid opens the instalment record below instead, and the
          payment that finishes the fee marks them paid on its own.
        </p>
      </div>

      {willRecord ? (
        <div>
          <label className="field-label" htmlFor={`landed-${registrationId}`}>
            Day the {formatMoney(outstanding)} landed
          </label>
          <input
            id={`landed-${registrationId}`}
            name="received_on"
            type="date"
            defaultValue={today()}
            className="field-input mt-2 sm:max-w-[10rem]"
          />
          <p className="mt-1.5 max-w-prose text-sm text-slate">
            Today unless you say otherwise. Saving records{" "}
            {formatMoney(outstanding)} against them on this day, which is what
            settles the fee.
          </p>
        </div>
      ) : null}

      <div>
        <label className="field-label" htmlFor={`note-${registrationId}`}>
          Your note
        </label>
        <input
          id={`note-${registrationId}`}
          name="admin_note"
          defaultValue={adminNote ?? ""}
          className="field-input mt-2"
          placeholder="Paying in two instalments, agreed by phone"
        />
      </div>

      <div className="flex flex-wrap items-center gap-5">
        <button type="submit" className="btn btn-quiet">
          Save
        </button>
        <Link
          href={`/admin?confirm_delete=${registrationId}#r-${registrationId}`}
          className="font-mono text-[0.6875rem] tracking-[0.14em] text-slate uppercase hover:text-madder"
        >
          Delete
        </Link>
      </div>
    </form>
  );
}
