import { getCollectorPriceMonthlyUsd } from "@/lib/billing/product-config";

export type PlanId = "starter" | "collector";

export type Plan = {
  id: PlanId;
  name: string;
  /** Display string; Stripe checkout uses `STRIPE_COLLECTOR_PRICE_ID` for billing amounts. */
  priceMonthlyUsd: number;
  description: string;
};

export const PLANS: Record<PlanId, Plan> = {
  starter: {
    id: "starter",
    name: "Starter",
    priceMonthlyUsd: 0,
    description: "Quick card value checks with reliable market data.",
  },
  collector: {
    id: "collector",
    name: "Collector",
    priceMonthlyUsd: getCollectorPriceMonthlyUsd(),
    description: "Unlimited searches with the most complete pricing snapshot.",
  },
};

export function getPlan(planId: PlanId): Plan {
  return PLANS[planId];
}
