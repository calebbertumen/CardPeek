import type Stripe from "stripe";
import { prisma } from "@/lib/db";

/**
 * Captures first-ever Collector payment references from the **first paid invoice** (`subscription_create`).
 * Never overwrites once `firstCollectorPaymentIntentId` is set.
 *
 * Where Stripe sets this:
 * - `invoice.paid` for `billing_reason === "subscription_create"` includes `payment_intent` (when paid by card).
 * - Verify in Dashboard: Customers → [customer] → Invoices → first subscription invoice → PaymentIntent link.
 */
export async function recordFirstCollectorPurchaseFromInvoiceIfNeeded(
  userId: string,
  invoice: Stripe.Invoice,
): Promise<void> {
  const br = (invoice as unknown as { billing_reason?: string | null }).billing_reason;
  if (br !== "subscription_create") return;

  const pi = (invoice as unknown as { payment_intent?: string | { id: string } | null }).payment_intent;
  const paymentIntentId = typeof pi === "string" ? pi : pi && typeof pi === "object" ? pi.id : null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { firstCollectorPaymentIntentId: true },
  });
  if (!user || user.firstCollectorPaymentIntentId) return;

  if (!paymentIntentId) {
    console.warn(
      `[billing] First Collector invoice ${invoice.id} has no payment_intent; refund-by-PI unavailable for user ${userId}`,
    );
    return;
  }

  const purchaseAt = invoice.status_transitions?.paid_at
    ? new Date(invoice.status_transitions.paid_at * 1000)
    : new Date(invoice.created * 1000);

  await prisma.user.update({
    where: { id: userId },
    data: {
      hasEverPurchasedCollector: true,
      firstCollectorPurchaseAt: purchaseAt,
      firstCollectorPaymentIntentId: paymentIntentId,
      firstCollectorInvoiceId: invoice.id,
    },
  });
}
