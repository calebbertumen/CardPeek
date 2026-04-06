import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe/server";
import { upsertSubscriptionFromStripe, markSubscriptionInactive } from "@/services/billing/stripe-provisioning";

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
        // subscription checkout
        const userId = session?.metadata?.userId as string | undefined;
        const customerId = (session.customer as string | null) ?? null;
        const subscriptionId = (session.subscription as string | null) ?? null;
        if (userId && subscriptionId) {
          const sub = await stripe.subscriptions.retrieve(subscriptionId);
          await upsertSubscriptionFromStripe({ userId, customerId, subscription: sub });
        }
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
        // ignore unneeded events for MVP
        break;
      }
    }
  } catch (e) {
    console.error("[stripe webhook] handler error", e);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

