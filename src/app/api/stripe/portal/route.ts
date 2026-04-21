import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getCanonicalUserFromSession } from "@/lib/require-db-user";
import { getStripe } from "@/lib/stripe/server";
import { getAppUrl } from "@/lib/stripe/config";

function isStripeTestLiveModeMismatch(error: unknown): boolean {
  const message =
    typeof error === "object" && error && "message" in error ? String((error as { message?: unknown }).message) : "";
  return message.includes("a similar object exists in live mode, but a test mode key was used to make this request");
}

export async function POST() {
  const session = await auth();
  const dbUser = await getCanonicalUserFromSession(session);
  if (!dbUser) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  const userId = dbUser.id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { stripeCustomerId: true },
  });
  if (!user?.stripeCustomerId) {
    return NextResponse.json({ error: "NO_CUSTOMER" }, { status: 400 });
  }

  const stripe = getStripe();
  try {
    const portal = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${getAppUrl()}/pricing`,
    });

    return NextResponse.json({ url: portal.url }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    if (isStripeTestLiveModeMismatch(e)) {
      return NextResponse.json({ error: "STRIPE_MODE_MISMATCH" }, { status: 400 });
    }
    console.error("[stripe] billing portal session create failed", e);
    return NextResponse.json({ error: "STRIPE_PORTAL_FAILED" }, { status: 500 });
  }
}

