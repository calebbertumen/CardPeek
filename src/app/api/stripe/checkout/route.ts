import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getStripe } from "@/lib/stripe/server";
import { getAppUrl, getCollectorPriceId } from "@/lib/stripe/config";

export async function POST() {
  const session = await auth();
  const userId = session?.user?.id;
  const email = session?.user?.email;
  if (!userId || !email) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const stripe = getStripe();
  const appUrl = getAppUrl();
  const priceId = getCollectorPriceId();

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { stripeCustomerId: true, email: true },
  });

  const customerId =
    user.stripeCustomerId ??
    (
      await stripe.customers.create({
        email: user.email,
        metadata: { userId },
      })
    ).id;

  if (!user.stripeCustomerId) {
    await prisma.user.update({ where: { id: userId }, data: { stripeCustomerId: customerId } });
  }

  /** Keep Stripe Customer email in sync so receipts and invoice emails go to the right address. */
  await stripe.customers.update(customerId, { email: user.email });

  const checkout = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    allow_promotion_codes: true,
    success_url: `${appUrl}/pricing?checkout=success`,
    cancel_url: `${appUrl}/pricing?checkout=cancel`,
    subscription_data: {
      metadata: { userId },
    },
    metadata: { userId },
    /** Shown on Stripe’s hosted Checkout next to the pay button (plain text; links on our pricing card). */
    custom_text: {
      submit: {
        message: `By subscribing, you agree to CardPeek’s Terms and Refund Policy. Full refund available within 5 days of your first purchase only. ${appUrl}/legal/terms · ${appUrl}/legal/refund-policy`,
      },
    },
  });

  return NextResponse.json({ url: checkout.url }, { headers: { "Cache-Control": "no-store" } });
}

