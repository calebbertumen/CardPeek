export function formatUsd(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/** Whole-dollar currency, for compact ranges (e.g. fair-price bands). */
export function formatUsdWhole(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatUsdSpan(low: number, high: number): string {
  if (low === high) return formatUsdWhole(low);
  return `${formatUsdWhole(low)} to ${formatUsdWhole(high)}`;
}

export function formatSoldDate(d: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

export function formatUpdatedAt(d: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

/** Next subscription charge / renewal date (date-only, user locale). */
export function formatNextBillingDate(d: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

/**
 * Stripe `current_period_end` is an instant in time; formatting with the default timezone differs between
 * Node (often UTC on hosts) and the browser (user locale), which can shift the calendar day.
 * Use one explicit zone so Dashboard (RSC) and Billing (client) match each other and Stripe’s billing date.
 * Override with `NEXT_PUBLIC_BILLING_DISPLAY_TIMEZONE` or `BILLING_DISPLAY_TIMEZONE` (IANA), e.g. `America/Los_Angeles`.
 * Prefer the `NEXT_PUBLIC_` name so server and client bundles use the same zone.
 */
export function formatSubscriptionPeriodEndDate(d: Date): string {
  const timeZone =
    process.env.NEXT_PUBLIC_BILLING_DISPLAY_TIMEZONE ??
    process.env.BILLING_DISPLAY_TIMEZONE ??
    "America/Los_Angeles";
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(d);
}
