/**
 * Landed cost for comparing listings to a user's target (price + shipping when known).
 */
export function totalListingCost(price: number, shipping: number | null | undefined): number {
  const p = Number.isFinite(price) ? price : 0;
  const s =
    shipping === null || shipping === undefined || Number.isNaN(Number(shipping))
      ? 0
      : Number(shipping);
  return Math.round((p + s) * 100) / 100;
}
