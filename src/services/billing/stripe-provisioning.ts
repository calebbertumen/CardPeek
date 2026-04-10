import type Stripe from "stripe";
import { prisma } from "@/lib/db";
import { getStripe } from "@/lib/stripe/server";
import { recordFirstCollectorPurchaseFromInvoiceIfNeeded } from "@/services/billing/first-collector-purchase.service";

/**
 * Central Stripe→DB provisioning helpers.
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
  const sub = input.subscription;
  const subscriptionStatus =
    sub.status === "active" || sub.status === "trialing" ? "active" : "inactive";
  const currentPeriodEndSeconds =
    (sub as unknown as { current_period_end?: number }).current_period_end ?? null;
  const cancelAtPeriodEnd = sub.cancel_at_period_end ?? false;

  const activeAccess = sub.status === "active" || sub.status === "trialing";

  const data = {
    userId: input.userId,
    stripeCustomerId: input.customerId ?? undefined,
    stripeSubscriptionId: sub.id,
    subscriptionStatus,
    planId,
    subscriptionCurrentPeriodEnd: currentPeriodEndSeconds
      ? new Date(currentPeriodEndSeconds * 1000)
      : null,
    cancelAtPeriodEnd,
  } satisfies Parameters<typeof prisma.subscription.upsert>[0]["create"];

  /**
   * We maintain at most one `Subscription` row per Stripe customer.
   * Keying by subscription id can violate the unique `stripeCustomerId` constraint
   * when Stripe creates a new subscription for the same customer (e.g. re-subscribe).
   */
  if (input.customerId) {
    await prisma.subscription.upsert({
      where: { stripeCustomerId: input.customerId },
      create: data,
      update: data,
    });
  } else {
    await prisma.subscription.upsert({
      where: { stripeSubscriptionId: sub.id },
      create: data,
      update: data,
    });
  }

  await prisma.user.update({
    where: { id: input.userId },
    data: { collectorTierActive: activeAccess },
  });
}

export async function markSubscriptionInactive(stripeSubscriptionId: string) {
  const rows = await prisma.subscription.findMany({
    where: { stripeSubscriptionId },
  });
  for (const row of rows) {
    await prisma.subscription.update({
      where: { id: row.id },
      data: {
        subscriptionStatus: "inactive",
        cancelAtPeriodEnd: false,
        subscriptionCurrentPeriodEnd: null,
      },
    });
    await prisma.user.update({
      where: { id: row.userId },
      data: {
        collectorTierActive: false,
        hasEverCanceledCollector: true,
      },
    });
  }
}

/**
 * Pull active/trialing subscription from Stripe and mirror to our DB.
 * Use after Checkout redirect: webhooks can arrive slightly later than the success URL.
 */
export async function syncSubscriptionFromStripeForUser(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { stripeCustomerId: true },
  });
  if (!user?.stripeCustomerId) return;

  const stripe = getStripe();
  const list = await stripe.subscriptions.list({
    customer: user.stripeCustomerId,
    status: "all",
    limit: 10,
  });

  const active = list.data.find((s) => s.status === "active" || s.status === "trialing");
  if (!active) return;

  // Capture the first paid invoice references so refund eligibility can be computed immediately
  // even if local webhooks arrive late or the CLI isn't running.
  try {
    const invoices = await stripe.invoices.list({
      subscription: active.id,
      limit: 10,
    });
    const firstPaid = invoices.data.find((inv) => {
      const br = (inv as unknown as { billing_reason?: string | null }).billing_reason;
      return br === "subscription_create" && inv.status === "paid";
    });
    if (firstPaid) {
      await recordFirstCollectorPurchaseFromInvoiceIfNeeded(userId, firstPaid);
    }
  } catch (e) {
    console.warn("[billing] failed to sync first Collector invoice", e);
  }

  await upsertSubscriptionFromStripe({
    userId,
    customerId: user.stripeCustomerId,
    subscription: active,
  });
}
