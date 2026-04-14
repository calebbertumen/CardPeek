import { prisma } from "@/lib/db";
import { getPlan, type PlanId } from "@/lib/billing/plans";
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
 * Plan resolution: `User.collectorTierActive` is primary; legacy `Subscription` rows self-heal on read.
 */
export async function getUserPlanId(userId: string | null | undefined): Promise<PlanId> {
  if (!userId) return "starter";

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

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { collectorTierActive: true },
  });

  let sub = await prisma.subscription.findFirst({
    where: { userId, planId: "collector" },
    orderBy: { updatedAt: "desc" },
    select: {
      subscriptionCurrentPeriodEnd: true,
      cancelAtPeriodEnd: true,
    },
  });

  if (
    planId === "collector" &&
    sub?.cancelAtPeriodEnd &&
    !sub.subscriptionCurrentPeriodEnd
  ) {
    await syncSubscriptionFromStripeForUser(userId);
    sub = await prisma.subscription.findFirst({
      where: { userId, planId: "collector" },
      orderBy: { updatedAt: "desc" },
      select: {
        subscriptionCurrentPeriodEnd: true,
        cancelAtPeriodEnd: true,
      },
    });
  }

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
