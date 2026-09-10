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
