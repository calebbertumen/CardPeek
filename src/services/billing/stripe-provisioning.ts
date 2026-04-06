import type Stripe from "stripe";
import { prisma } from "@/lib/db";

/**
 * Central Stripe->DB provisioning helpers.
 *
 * Idempotent updates keyed by Stripe ids.
 */

export async function ensureUserStripeCustomer(userId: string, customerId: string | null) {
  if (!customerId) return;
  await prisma.user.update({
    where: { id: userId },
    data: { stripeCustomerId: customerId },
  });
}

export async function upsertSubscriptionFromStripe(input: {
  userId: string;
  customerId: string | null;
  subscription: Stripe.Subscription;
}) {
  await ensureUserStripeCustomer(input.userId, input.customerId);

  const planId = "collector";
  const status = input.subscription.status === "active" || input.subscription.status === "trialing" ? "active" : "inactive";
  const currentPeriodEndSeconds =
    (input.subscription as unknown as { current_period_end?: number }).current_period_end ?? null;

  await prisma.subscription.upsert({
    where: { stripeSubscriptionId: input.subscription.id },
    create: {
      userId: input.userId,
      stripeCustomerId: input.customerId ?? undefined,
      stripeSubscriptionId: input.subscription.id,
      status,
      planId,
      currentPeriodEnd: currentPeriodEndSeconds
        ? new Date(currentPeriodEndSeconds * 1000)
        : null,
    },
    update: {
      userId: input.userId,
      stripeCustomerId: input.customerId ?? undefined,
      status,
      planId,
      currentPeriodEnd: currentPeriodEndSeconds
        ? new Date(currentPeriodEndSeconds * 1000)
        : null,
    },
  });
}

export async function markSubscriptionInactive(stripeSubscriptionId: string) {
  await prisma.subscription.updateMany({
    where: { stripeSubscriptionId },
    data: { status: "inactive" },
  });
}

