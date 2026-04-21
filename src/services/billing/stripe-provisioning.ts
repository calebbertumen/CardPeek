import type Stripe from "stripe";
import { prisma } from "@/lib/db";
import { getStripe } from "@/lib/stripe/server";
import { recordFirstCollectorPurchaseFromInvoiceIfNeeded } from "@/services/billing/first-collector-purchase.service";

/**
 * Central Stripe→DB provisioning helpers.
 *
 * Idempotent updates keyed by Stripe ids.
 */

/** Paid access window: active billing, trial, or payment-retry grace (`past_due`). */
export function subscriptionGrantsCollectorAccess(sub: Stripe.Subscription): boolean {
  return (
    sub.status === "active" || sub.status === "trialing" || sub.status === "past_due"
  );
}

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
  const subscriptionStatus = subscriptionGrantsCollectorAccess(sub) ? "active" : "inactive";
  const currentPeriodEndSeconds =
    (sub as unknown as { current_period_end?: number }).current_period_end ?? null;
  const cancelAtPeriodEnd = sub.cancel_at_period_end ?? false;

  const activeAccess = subscriptionGrantsCollectorAccess(sub);

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
  const stripe = getStripe();

  for (const row of rows) {
    let customerId = row.stripeCustomerId;
    if (!customerId) {
      const u = await prisma.user.findUnique({
        where: { id: row.userId },
        select: { stripeCustomerId: true },
      });
      customerId = u?.stripeCustomerId ?? null;
    }

    /**
     * Re-subscribe / refund flows can leave a stale `stripeSubscriptionId` on our row, or Stripe
     * can deliver `customer.subscription.deleted` for an old sub after a newer one exists. If the
     * customer still has any paying subscription, mirror that instead of revoking access.
     */
    if (customerId) {
      const list = await stripe.subscriptions.list({
        customer: customerId,
        status: "all",
        limit: 20,
      });
      const replacement = list.data.find(subscriptionGrantsCollectorAccess);
      if (replacement) {
        await upsertSubscriptionFromStripe({
          userId: row.userId,
          customerId,
          subscription: replacement,
        });
        continue;
      }
    }

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
  let list: Stripe.ApiList<Stripe.Subscription>;
  try {
    list = await stripe.subscriptions.list({
      customer: user.stripeCustomerId,
      status: "all",
      limit: 10,
    });
  } catch (e) {
    const message =
      typeof e === "object" && e && "message" in e ? String((e as { message?: unknown }).message) : "";
    if (
      message.includes(
        "a similar object exists in live mode, but a test mode key was used to make this request",
      )
    ) {
      console.warn("[billing] Stripe mode mismatch for stripeCustomerId; skipping sync");
      return;
    }
    throw e;
  }

  const active = list.data.find(subscriptionGrantsCollectorAccess);
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
