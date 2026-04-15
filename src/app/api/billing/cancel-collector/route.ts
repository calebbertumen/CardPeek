import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCanonicalUserFromSession } from "@/lib/require-db-user";
import {
  cancelCollectorSubscriptionForUser,
  type CancelCollectorIntent,
} from "@/services/billing/cancel-collector-subscription.service";

export async function POST(req: Request) {
  const session = await auth();
  const dbUser = await getCanonicalUserFromSession(session);
  if (!dbUser) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }
  const userId = dbUser.id;

  let intent: CancelCollectorIntent = "period_end";
  try {
    const body = (await req.json()) as { intent?: string };
    if (body?.intent === "refund") intent = "refund";
  } catch {
    // empty body ok
  }

  const result = await cancelCollectorSubscriptionForUser(userId, intent);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(
    {
      refunded: result.refunded,
      accessEndsImmediately: result.accessEndsImmediately,
      accessEndsAtPeriodEnd: result.accessEndsAtPeriodEnd,
      currentPeriodEnd: result.currentPeriodEnd?.toISOString() ?? null,
      message: result.message,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
