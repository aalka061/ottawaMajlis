"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { EMPTY_FORM_STATE, type FormState } from "@/lib/form-state";
import { formatMoney, type Settlement } from "@/lib/money";
import type { Payment } from "@/lib/types";

type Action = (state: FormState, formData: FormData) => Promise<FormState>;

/** A plain date read at noon, so a UTC midnight is not the evening before. */
function readDate(isoDate: string) {
  return new Date(`${isoDate}T12:00:00Z`).toLocaleDateString("en-CA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function RecordButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-quiet" disabled={pending}>
      {pending ? "Saving…" : "Record"}
    </button>
  );
}

function Error({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-sm text-madder">{message}</p>;
}

/**
 * Where one person's money is written down: every transfer that has arrived,
 * what that leaves owing, and when the next one is expected.
 *
 * The list is the record and the total is read off it, rather than the other
 * way round. A fee settled over two months is two transfers on two days, and
 * a single figure typed over itself cannot say which day either of them came
 * — which is the thing you go looking for when a transfer is disputed.
 */
export function MoneyPanel({
  registrationId,
  payments,
  settlement,
  nextDue,
  recordAction,
  removeAction,
  confirmRemoveHref,
  keepHref,
  confirmingId,
}: {
  registrationId: string;
  payments: Payment[];
  settlement: Settlement;
  nextDue: string | null;
  recordAction: Action;
  removeAction: (formData: FormData) => Promise<void>;
  /** Builds the link that asks before a payment is taken back off the row. */
  confirmRemoveHref: (paymentId: string) => string;
  keepHref: string;
  /** The payment the page is currently asking about, if any. */
  confirmingId?: string;
}) {
  const [state, formAction] = useActionState(recordAction, EMPTY_FORM_STATE);
  const err = state.fieldErrors;

  // Nothing clears these fields by hand: React resets an uncontrolled form
  // once its action has run, and the register has re-rendered by then — so
  // the amount comes back empty for the next instalment and the due date
  // comes back as whatever was just saved.

  return (
    <div className="border-t border-line pt-5 md:col-span-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <p className="field-label">The money</p>
        <p className="font-mono text-xs text-slate">
          {settlement.fee === null ? (
            <>
              {formatMoney(settlement.paid)} received · no fee amount set on
              this program, so no balance
            </>
          ) : (
            <>
              {formatMoney(settlement.paid)} of {formatMoney(settlement.fee)}
              {settlement.settled ? (
                <span className="text-brass"> · settled</span>
              ) : (
                <span className="text-madder">
                  {" "}
                  · {formatMoney(settlement.outstanding ?? 0)} outstanding
                </span>
              )}
            </>
          )}
        </p>
      </div>

      {payments.length > 0 ? (
        <ul className="mt-3 divide-y divide-line border-y border-line">
          {payments.map((p) => (
            <li key={p.id} className="py-2.5">
              {confirmingId === p.id ? (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <span className="text-sm">
                    Take {formatMoney(p.amount)} of{" "}
                    {readDate(p.received_on)} back off the record?
                  </span>
                  <form action={removeAction} className="contents">
                    <input type="hidden" name="id" value={registrationId} />
                    <input type="hidden" name="payment_id" value={p.id} />
                    <button type="submit" className="btn btn-danger">
                      Remove it
                    </button>
                  </form>
                  <Link href={keepHref} className="btn btn-quiet">
                    Keep it
                  </Link>
                </div>
              ) : (
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <span className="font-mono text-sm">
                    {formatMoney(p.amount)}
                    <span className="text-slate">
                      {" "}
                      · {readDate(p.received_on)}
                    </span>
                    {p.note ? (
                      <span className="text-slate"> · {p.note}</span>
                    ) : null}
                  </span>
                  <Link
                    href={confirmRemoveHref(p.id)}
                    className="font-mono text-[0.6875rem] tracking-[0.14em] text-slate uppercase hover:text-madder"
                  >
                    Remove
                  </Link>
                </div>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 border-y border-line py-2.5 text-sm text-slate">
          No payment recorded yet.
        </p>
      )}

      <form action={formAction} className="mt-4">
        <input type="hidden" name="id" value={registrationId} />
        <div className="grid gap-3 sm:grid-cols-[7rem_10rem_1fr_auto] sm:items-end">
          <div>
            <label className="field-label" htmlFor={`amount-${registrationId}`}>
              Amount
            </label>
            <input
              id={`amount-${registrationId}`}
              name="amount"
              inputMode="decimal"
              placeholder={
                settlement.outstanding && settlement.outstanding > 0
                  ? String(settlement.outstanding.toFixed(2))
                  : "75.00"
              }
              className="field-input mt-2"
            />
          </div>
          <div>
            <label
              className="field-label"
              htmlFor={`received-${registrationId}`}
            >
              Received on
            </label>
            <input
              id={`received-${registrationId}`}
              name="received_on"
              type="date"
              defaultValue={today()}
              className="field-input mt-2"
            />
          </div>
          <div>
            <label className="field-label" htmlFor={`due-${registrationId}`}>
              Next payment due
            </label>
            <input
              id={`due-${registrationId}`}
              name="next_payment_due"
              type="date"
              defaultValue={nextDue ?? ""}
              className="field-input mt-2"
            />
          </div>
          <RecordButton />
        </div>
        <div>
          <label className="field-label sr-only" htmlFor={`pn-${registrationId}`}>
            What this payment was
          </label>
          <input
            id={`pn-${registrationId}`}
            name="payment_note"
            className="field-input mt-3"
            placeholder="First instalment, e-transfer from a family account…"
          />
        </div>
        <Error message={err.amount} />
        <Error message={err.received_on} />
        <Error message={err.next_payment_due} />
        <p className="mt-2 max-w-prose text-sm text-slate">
          Leave the amount empty to move the next payment date on its own —
          an arrangement can be made before any of it has been sent.
          {nextDue ? (
            <>
              {" "}
              Next expected{" "}
              <span className="text-ink">{readDate(nextDue)}</span>.
            </>
          ) : null}
        </p>
        {state.message ? (
          <p
            className={`mt-2 max-w-prose text-sm ${
              state.status === "error" ? "text-madder" : "text-slate"
            }`}
            role="status"
          >
            {state.message}
          </p>
        ) : null}
      </form>
    </div>
  );
}
