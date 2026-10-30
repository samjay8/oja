// All amounts are integer minor units (cents, kobo). Never floats.

export type Currency = "USD" | "NGN" | "GBP" | "EUR" | "CAD";

export const PAYPAL_CURRENCIES: ReadonlySet<Currency> = new Set(["USD"]);

export function assertMinor(n: number, label = "amount"): number {
  if (!Number.isSafeInteger(n) || n < 0) {
    throw new Error(`${label} must be a non-negative integer in minor units, got ${n}`);
  }
  return n;
}

export function format(minor: number, currency: Currency): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    minimumFractionDigits: currency === "NGN" ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(minor / 100);
}

/** "12.50" — the string PayPal expects. */
export function toDecimalString(minor: number): string {
  assertMinor(minor);
  const whole = Math.floor(minor / 100);
  const frac = String(minor % 100).padStart(2, "0");
  return `${whole}.${frac}`;
}

export function toDecimalNumber(minor: number): number {
  return Number(toDecimalString(minor));
}

/** Round up to the vendor's price step (e.g. ₦100 = 10_000 kobo, $1 = 100 cents). */
export function roundUpTo(minor: number, step: number): number {
  if (step <= 1) return Math.ceil(minor);
  return Math.ceil(minor / step) * step;
}

export function roundDownTo(minor: number, step: number): number {
  if (step <= 1) return Math.floor(minor);
  return Math.floor(minor / step) * step;
}
