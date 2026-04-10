import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getStripe } from "@/lib/stripe/server";
import {
  upsertSubscriptionFromStripe,
  markSubscriptionInactive,
} from "@/services/billing/stripe-provisioning";
import { recordFirstCollectorPurchaseFromInvoiceIfNeeded } from "@/services/billing/first-collector-purchase.service";

export async function POST(req: Request) {
  const stripe = getStripe();
  const sig = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !secret) {
    return NextResponse.json({ error: "Missing webhook secret/signature" }, { status: 400 });
  }

  const body = await req.text();

  let event: import("stripe").Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Invalid signature";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as import("stripe").Stripe.Checkout.Session;
        const userId = session?.metadata?.userId as string | undefined;
        const customerId = (session.customer as string | null) ?? null;
        const subscriptionId = (session.subscription as string | null) ?? null;
        if (userId && subscriptionId) {
          const sub = await stripe.subscriptions.retrieve(subscriptionId);
          await upsertSubscriptionFromStripe({ userId, customerId, subscription: sub });
        }
        break;
      }
      case "invoice.paid": {
        const invoice = event.data.object as import("stripe").Stripe.Invoice;
        const customerId =
          typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id ?? null;
        const invSub = (invoice as unknown as { subscription?: string | { id: string } | null })
          .subscription;
        const subscriptionId =
          typeof invSub === "string" ? invSub : invSub && typeof invSub === "object" ? invSub.id : null;
        if (!customerId || !subscriptionId) break;

        const dbUser = await prisma.user.findFirst({
          where: { stripeCustomerId: customerId },
          select: { id: true },
        });
        if (!dbUser) break;

        await recordFirstCollectorPurchaseFromInvoiceIfNeeded(dbUser.id, invoice);

        const sub = await stripe.subscriptions.retrieve(subscriptionId);
        const metaUserId = (sub.metadata?.userId as string | undefined) ?? dbUser.id;
        await upsertSubscriptionFromStripe({
          userId: metaUserId,
          customerId,
          subscription: sub,
        });
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as import("stripe").Stripe.Subscription;
        const userId = (subscription.metadata?.userId as string | undefined) ?? undefined;
        const customerId = (subscription.customer as string | null) ?? null;
        if (userId) {
          await upsertSubscriptionFromStripe({ userId, customerId, subscription });
        }
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as import("stripe").Stripe.Subscription;
        await markSubscriptionInactive(subscription.id);
        break;
      }
      default: {
        break;
      }
    }
  } catch (e) {
    console.error("[stripe webhook] handler error", e);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
