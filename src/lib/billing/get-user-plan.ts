import type { Session } from "next-auth";
import { prisma } from "@/lib/db";
import { getPlan, type PlanId } from "@/lib/billing/plans";
import { getCanonicalUserFromSession } from "@/lib/require-db-user";
import { syncSubscriptionFromStripeForUser } from "@/services/billing/stripe-provisioning";
import {
  canUserReceiveCollectorRefund,
  type CollectorRefundEligibilityResult,
} from "@/lib/billing/collector-refund-eligibility";

export type UserSubscriptionSummary = {
  planId: PlanId;
  planName: string;
  /** Stripe subscription period end when active paid plan; otherwise null */
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  collectorTierActive: boolean;
};

export type UserBillingState = UserSubscriptionSummary & {
  refundEligibility: CollectorRefundEligibilityResult;
};

/**
 * If Stripe still shows an active Collector sub but our DB flag is stale (e.g. missed webhook),
 * pull from Stripe once. Scoped to users we know have used Stripe Collector to avoid API noise
 * on every Starter with only an abandoned Checkout customer id.
 */
async function maybeHealCollectorFromStripe(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { collectorTierActive: true, stripeCustomerId: true, hasEverPurchasedCollector: true },
  });
  if (!user || user.collectorTierActive || !user.stripeCustomerId) return;

  if (!user.hasEverPurchasedCollector) {
    const hadCollectorRow = await prisma.subscription.findFirst({
      where: { userId, planId: "collector" },
      select: { id: true },
    });
    if (!hadCollectorRow) return;
  }

  await syncSubscriptionFromStripeForUser(userId);
}

/** Prefer over `getUserPlanId(session.user.id)` so JWT `sub` always maps to the same row Stripe updates. */
export async function getUserPlanIdForSession(session: Session | null | undefined): Promise<PlanId> {
  const u = await getCanonicalUserFromSession(session);
  if (!u) return "starter";
  return getUserPlanId(u.id);
}

/**
 * Plan resolution: `User.collectorTierActive` is primary; legacy `Subscription` rows self-heal on read.
 */
export async function getUserPlanId(userId: string | null | undefined): Promise<PlanId> {
  if (!userId) return "starter";

  await maybeHealCollectorFromStripe(userId);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { collectorTierActive: true },
  });
  if (user?.collectorTierActive) return "collector";

  const legacy = await prisma.subscription.findFirst({
    where: { userId, subscriptionStatus: "active", planId: "collector" },
    select: { id: true },
  });
  if (legacy) {
    await prisma.user.update({
      where: { id: userId },
      data: { collectorTierActive: true },
    });
    return "collector";
  }
  return "starter";
}

/** Active subscription row + resolved tier for dashboard / account UI. */
export async function getUserSubscriptionSummary(userId: string): Promise<UserSubscriptionSummary> {
  const planId = await getUserPlanId(userId);
  const plan = getPlan(planId);

  /**
   * While Collector is active, `maybeHealCollectorFromStripe` intentionally skips Stripe calls.
   * Cancellation-at-period-end and period end dates still need to match Stripe for accurate UI.
   */
  if (planId === "collector") {
    const u = await prisma.user.findUnique({
      where: { id: userId },
      select: { stripeCustomerId: true },
    });
    if (u?.stripeCustomerId) {
      try {
        await syncSubscriptionFromStripeForUser(userId);
      } catch (e) {
        console.warn("[billing] getUserSubscriptionSummary Stripe sync failed", e);
      }
    }
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { collectorTierActive: true },
  });

  const sub = await prisma.subscription.findFirst({
    where: { userId, planId: "collector" },
    orderBy: { updatedAt: "desc" },
    select: {
      subscriptionCurrentPeriodEnd: true,
      cancelAtPeriodEnd: true,
    },
  });

  return {
    planId,
    planName: plan.name,
    currentPeriodEnd: planId === "collector" ? sub?.subscriptionCurrentPeriodEnd ?? null : null,
    cancelAtPeriodEnd: sub?.cancelAtPeriodEnd ?? false,
    collectorTierActive: Boolean(user?.collectorTierActive),
  };
}

export async function getUserBillingState(userId: string): Promise<UserBillingState> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      collectorTierActive: true,
      hasEverPurchasedCollector: true,
      hasUsedCollectorRefund: true,
      hasEverCanceledCollector: true,
      firstCollectorPurchaseAt: true,
      firstCollectorPaymentIntentId: true,
    },
  });

  const summary = await getUserSubscriptionSummary(userId);

  const refundEligibility = canUserReceiveCollectorRefund({
    hasEverPurchasedCollector: u?.hasEverPurchasedCollector ?? false,
    hasUsedCollectorRefund: u?.hasUsedCollectorRefund ?? false,
    hasEverCanceledCollector: u?.hasEverCanceledCollector ?? false,
    firstCollectorPurchaseAt: u?.firstCollectorPurchaseAt ?? null,
    firstCollectorPaymentIntentId: u?.firstCollectorPaymentIntentId ?? null,
  });

  return { ...summary, refundEligibility };
}

/** Paid Collector subscription. */
export async function isPaidCollector(userId: string): Promise<boolean> {
  return (await getUserPlanId(userId)) === "collector";
}
