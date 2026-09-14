/**
 * Money in this register is small, plain, and Canadian: a course fee and the
 * two or three transfers that settle it. Everything is held as a number of
 * dollars, because that is what the database column is and what someone types
 * into the form, and every sum is done in whole cents, because adding 0.1 to
 * 0.2 in a float does not give 0.3 and a balance that is a hundredth of a cent
 * out reads as a balance.
 */

/** Dollars to whole cents, rounded — the only safe thing to add up. */
export function toCents(amount: number): number {
  return Math.round(amount * 100);
}

export function fromCents(cents: number): number {
  return cents / 100;
}

/** Adds dollar amounts without the float drift. */
export function sumAmounts(amounts: number[]): number {
  return fromCents(amounts.reduce((total, a) => total + toCents(a), 0));
}

const MONEY = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
  currencyDisplay: "narrowSymbol",
});

/** As it is read: $150.00, and $0.00 rather than nothing. */
export function formatMoney(amount: number): string {
  return MONEY.format(amount);
}

/**
 * What someone typed into an amount field, or null if it was not a positive
 * amount of money. Tolerates a dollar sign, commas, and surrounding space,
 * because a figure copied out of a banking email carries all three.
 */
export function parseAmount(input: string): number | null {
  const cleaned = input.replace(/[$,\s]/g, "");
  if (!cleaned) return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value <= 0) return null;
  // Two decimal places is the whole of what a cent needs; anything longer is
  // a typo rather than precision.
  return fromCents(toCents(value));
}

export type Settlement = {
  /** What has arrived, summed from the payments on the row. */
  paid: number;
  /** What the program asks for, null when no amount has been set. */
  fee: number | null;
  /** What is left, null when there is no fee to work it out from. */
  outstanding: number | null;
  /** True once the fee is met. False while a balance stands. */
  settled: boolean;
  /** Some money has arrived and it is not the whole of it. */
  partial: boolean;
};

/**
 * The state of one person's money. A fee of null is a program whose amount
 * has not been set: what arrived is still known, what remains is not, and the
 * register says so rather than guessing.
 */
export function settle(paid: number, fee: number | null): Settlement {
  const paidCents = toCents(paid);
  const feeCents = fee === null ? null : toCents(fee);
  const settled = feeCents !== null && feeCents > 0 && paidCents >= feeCents;
  return {
    paid,
    fee,
    outstanding:
      feeCents === null ? null : fromCents(Math.max(0, feeCents - paidCents)),
    settled,
    partial: paidCents > 0 && !settled,
  };
}

/**
 * What one row puts into a tally, which is not always what its payments say.
 *
 * Almost always it is the payments: marking someone paid writes the balance as
 * a transfer, so a paid row carries its own record and is read off it, and an
 * overpayment shows as the amount that actually landed.
 *
 * The fee stands in only where a paid row has no payments at all — a row marked
 * paid before the register wrote the transfer for you. It owes nothing either
 * way, which is the part that matters: the status is the claim that the fee was
 * settled, and a register that goes on asking a settled person for money is the
 * thing this avoids.
 *
 * The register and the CSV export both go through here. They used to work the
 * figures out separately, which was harmless while every payment was itemised
 * and wrong the moment one was not.
 */
export function tally(
  stands: Settlement,
  status: string,
): { received: number; outstanding: number | null } {
  if (status !== "confirmed") {
    return { received: stands.paid, outstanding: stands.outstanding };
  }
  return {
    received: stands.paid > 0 ? stands.paid : (stands.fee ?? 0),
    // A program with no fee amount set has nothing to have met, so a paid row
    // on one is still not claiming a balance of zero.
    outstanding: stands.fee === null ? null : 0,
  };
}
