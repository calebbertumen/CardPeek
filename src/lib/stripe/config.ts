export function getAppUrl(): string {
  const url =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  return url.replace(/\/+$/, "");
}

/** Stripe Price ID for the Collector subscription (create a $6.99/mo recurring price in Dashboard). */
export function getCollectorPriceId(): string {
  const id = process.env.STRIPE_COLLECTOR_PRICE_ID;
  if (!id) throw new Error("Missing STRIPE_COLLECTOR_PRICE_ID");
  return id;
}

