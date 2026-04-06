import { prisma } from "@/lib/db";
import type { PlanId } from "@/lib/billing/plans";

/**
 * MVP plan resolution.
 *
 * Source of truth today:
 * - If the user has an active Subscription with planId === "collector" => Collector
 * - Otherwise => Starter
 *
 * TODO(billing): When Stripe is wired, map Stripe price/product IDs to PlanId.
 */
export async function getUserPlanId(userId: string | null | undefined): Promise<PlanId> {
  if (!userId) return "starter";

  const sub = await prisma.subscription.findFirst({
    where: { userId, status: "active" },
    orderBy: { updatedAt: "desc" },
    select: { planId: true },
  });

  if (sub?.planId === "collector") return "collector";
  return "starter";
}

/** Paid Collector subscription — used for notifications and watchlist background work. */
export async function isPaidCollector(userId: string): Promise<boolean> {
  return (await getUserPlanId(userId)) === "collector";
}

