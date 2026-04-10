import { prisma } from "@/lib/db";
import { getStripe } from "@/lib/stripe/server";
import { canUserReceiveCollectorRefund } from "@/lib/billing/collector-refund-eligibility";

export type CancelCollectorResult =
  | {
      ok: true;
      refunded: boolean;
      accessEndsImmediately: boolean;
      accessEndsAtPeriodEnd: boolean;
      currentPeriodEnd: Date | null;
      message: string;
    }
  | { ok: false; error: string };

export type CancelCollectorIntent = "refund" | "period_end";

/**
 * Server-only cancellation. Refund path uses ONLY `firstCollectorPaymentIntentId` (never latest invoice).
 * When `intent` is `period_end`, never refunds—even inside the 5-day window.
 */
export async function cancelCollectorSubscriptionForUser(
  userId: string,
  intent: CancelCollectorIntent = "period_end",
): Promise<CancelCollectorResult> {
  const user = await prisma.user.findUnique({
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

  if (!user?.collectorTierActive) {
    return { ok: false, error: "No active Collector subscription to cancel." };
  }

  const subRow = await prisma.subscription.findFirst({
    where: { userId, planId: "collector", stripeSubscriptionId: { not: null } },
    orderBy: { updatedAt: "desc" },
  });

  if (!subRow?.stripeSubscriptionId) {
    return { ok: false, error: "Subscription record is missing Stripe ids." };
  }

  const stripe = getStripe();
  const eligibility = canUserReceiveCollectorRefund({
    hasEverPurchasedCollector: user.hasEverPurchasedCollector,
    hasUsedCollectorRefund: user.hasUsedCollectorRefund,
    hasEverCanceledCollector: user.hasEverCanceledCollector,
    firstCollectorPurchaseAt: user.firstCollectorPurchaseAt,
    firstCollectorPaymentIntentId: user.firstCollectorPaymentIntentId,
  });

  if (intent === "refund" && eligibility.eligible) {
    if (!user.firstCollectorPaymentIntentId) {
      console.error(`[billing] Eligibility passed but missing PI for user ${userId}`);
      return { ok: false, error: "Refund could not be processed: original payment is not on file." };
    }

    if (user.hasUsedCollectorRefund) {
      return { ok: false, error: "Refund already recorded." };
    }

    try {
      await stripe.refunds.create(
        { payment_intent: user.firstCollectorPaymentIntentId },
        { idempotencyKey: `collector-full-refund-${userId}` },
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Stripe refund failed";
      console.error("[billing] refund failed", e);
      return { ok: false, error: msg };
    }

    try {
      await stripe.subscriptions.cancel(subRow.stripeSubscriptionId);
    } catch (e) {
      console.error("[billing] cancel after refund failed — manual reconcile", e);
      return {
        ok: false,
        error: "Refund succeeded but cancelling the subscription failed. Contact support with your account email.",
      };
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: {
          hasUsedCollectorRefund: true,
          collectorTierActive: false,
          hasEverCanceledCollector: true,
        },
      }),
      prisma.subscription.updateMany({
        where: { stripeSubscriptionId: subRow.stripeSubscriptionId },
        data: {
          subscriptionStatus: "inactive",
          cancelAtPeriodEnd: false,
          subscriptionCurrentPeriodEnd: null,
        },
      }),
    ]);

    return {
      ok: true,
      refunded: true,
      accessEndsImmediately: true,
      accessEndsAtPeriodEnd: false,
      currentPeriodEnd: null,
      message: "Your first Collector charge was refunded and your subscription has been cancelled.",
    };
  }

  const stripeSubRaw = await stripe.subscriptions.retrieve(subRow.stripeSubscriptionId);
  const stripeSub = stripeSubRaw as unknown as {
    cancel_at_period_end?: boolean;
    current_period_end?: number;
  };
  if (stripeSub.cancel_at_period_end) {
    const end = stripeSub.current_period_end
      ? new Date(stripeSub.current_period_end * 1000)
      : null;
    return {
      ok: true,
      refunded: false,
      accessEndsImmediately: false,
      accessEndsAtPeriodEnd: true,
      currentPeriodEnd: end,
      message: "Your subscription is already set to cancel at the end of the billing period.",
    };
  }

  await stripe.subscriptions.update(subRow.stripeSubscriptionId, { cancel_at_period_end: true });

  const updatedRaw = await stripe.subscriptions.retrieve(subRow.stripeSubscriptionId);
  const updated = updatedRaw as unknown as {
    current_period_end?: number;
    status?: string;
  };
  const periodEnd = updated.current_period_end ? new Date(updated.current_period_end * 1000) : null;

  const normalizedStatus =
    updated.status === "active" || updated.status === "trialing" ? "active" : "inactive";

  await prisma.subscription.updateMany({
    where: { stripeSubscriptionId: subRow.stripeSubscriptionId },
    data: {
      cancelAtPeriodEnd: true,
      subscriptionCurrentPeriodEnd: periodEnd,
      subscriptionStatus: normalizedStatus,
    },
  });

  return {
    ok: true,
    refunded: false,
    accessEndsImmediately: false,
    accessEndsAtPeriodEnd: true,
    currentPeriodEnd: periodEnd,
    message: periodEnd
      ? `You’ll keep Collector access until ${periodEnd.toLocaleDateString()}. You won’t be charged again.`
      : "Your subscription will end after the current period. You won’t be charged again.",
  };
}
