import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getPlan, type PlanId } from "@/lib/billing/plans";
import { auth } from "@/lib/auth";
import { getUserPlanId } from "@/lib/billing/get-user-plan";
import { getCanonicalUserFromSession } from "@/lib/require-db-user";
import { StripeCheckoutButton } from "@/components/billing/stripe-checkout-button";
import { syncSubscriptionFromStripeForUser } from "@/services/billing/stripe-provisioning";
import { cn } from "@/lib/utils";

function pickSearchParam(value: string | string[] | undefined): string | undefined {
  if (value === undefined) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

export const metadata: Metadata = {
  title: "Pricing",
};

function CollectorPlanActions({
  userId,
  currentPlanId,
}: {
  userId: string | undefined;
  currentPlanId: PlanId | null;
}) {
  if (!userId) {
    return (
      <Button asChild className="w-full rounded-full">
        <Link href="/register?callbackUrl=/pricing">Unlock real prices</Link>
      </Button>
    );
  }

  if (currentPlanId === "collector") {
    return (
      <Button type="button" className="w-full rounded-full" disabled>
        Collector active ✅
      </Button>
    );
  }

  return <StripeCheckoutButton>Unlock real prices</StripeCheckoutButton>;
}

type PricingPageProps = {
  searchParams: Record<string, string | string[] | undefined>;
};

export default async function PricingPage({ searchParams }: PricingPageProps) {
  const session = await auth();
  const dbUser = await getCanonicalUserFromSession(session);
  const checkout = pickSearchParam(searchParams.checkout);

  if (dbUser && checkout === "success") {
    try {
      await syncSubscriptionFromStripeForUser(dbUser.id);
    } catch (e) {
      console.error("[pricing] post-checkout Stripe sync failed", e);
    }
    redirect("/pricing");
  }

  const currentPlanId = dbUser ? await getUserPlanId(dbUser.id) : null;
  const collector = getPlan("collector");

  const starterIsCurrent = Boolean(dbUser && currentPlanId === "starter");
  const collectorIsCurrent = Boolean(dbUser && currentPlanId === "collector");

  return (
    <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6">
      <div className="text-center">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Know what your cards are actually worth.
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
          Powered by real eBay sold listings. Updated automatically when needed.
        </p>
      </div>

      <p className="mx-auto mt-10 max-w-xl text-center text-sm font-medium text-foreground">
        Free gives you an estimate. Collector shows you the real market.
      </p>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <Card
          className={cn(
            "border-border/80 shadow-md shadow-black/25 transition-shadow",
            starterIsCurrent && "border-primary/70 ring-2 ring-primary/25 shadow-primary/10",
          )}
        >
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1.5">
                <CardTitle className="text-xl">Starter (Free)</CardTitle>
                <CardDescription>Get a quick, reliable estimate of your card&apos;s value.</CardDescription>
              </div>
              {starterIsCurrent ? (
                <Badge variant="default" className="shrink-0">
                  Your plan
                </Badge>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-4xl font-semibold tracking-tight text-primary">$0</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Unlimited searches (cached data)</li>
              <li>• 3 lifetime fresh data updates</li>
              <li>• Average price based on recent sales</li>
              <li>• Price range insights</li>
              <li>• Preview recent sales (blurred)</li>
              <li className="font-semibold text-foreground">• Track up to 10 cards in your collection</li>
              <li>• View your collection&apos;s total value (based on cached data)</li>
            </ul>
            <Button asChild className="w-full rounded-full" variant={starterIsCurrent ? "secondary" : "default"}>
              <Link href="/search">Check a card for free</Link>
            </Button>
          </CardContent>
        </Card>

        <Card
          className={cn(
            "border-border/80 shadow-md shadow-black/25 transition-shadow",
            collectorIsCurrent && "border-primary/70 ring-2 ring-primary/25 shadow-primary/10",
          )}
        >
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1.5">
                <CardTitle className="text-xl">Collector</CardTitle>
                <CardDescription>See exactly what your cards are selling for.</CardDescription>
              </div>
              {collectorIsCurrent ? (
                <Badge variant="default" className="shrink-0">
                  Your plan
                </Badge>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <p className="text-4xl font-semibold tracking-tight text-primary">
                ${collector.priceMonthlyUsd.toFixed(2)}/mo
              </p>
              <p className="mt-1 text-sm italic text-muted-foreground">Less than the price of one bad buy.</p>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Full access to real sold listings</li>
              <li>• See up to 5 most recent verified sales</li>
              <li>• Accurate pricing from actual transactions</li>
              <li>• Full price range insights</li>
              <li>• Unlimited access to updated market data (fair use applies)</li>
              <li className="font-semibold text-foreground">
                • Unlimited collection tracking with updated pricing when available
              </li>
              <li className="font-semibold text-foreground">• Know exactly what your collection is worth right now</li>
              <li>• No more guessing or overpriced comps</li>
            </ul>
            <div id="checkout" />
            {!collectorIsCurrent ? (
              <p className="text-[11px] leading-snug text-muted-foreground sm:text-xs">
                By subscribing, you agree to our{" "}
                <Link href="/legal/terms" className="font-medium text-foreground underline underline-offset-2">
                  Terms
                </Link>{" "}
                and{" "}
                <Link href="/legal/refund-policy" className="font-medium text-foreground underline underline-offset-2">
                  refund policy
                </Link>
                . Full refund available within 5 days of your first purchase only.
              </p>
            ) : null}
            <CollectorPlanActions userId={dbUser?.id} currentPlanId={currentPlanId} />
            {collectorIsCurrent ? (
              <Button asChild variant="outline" className="w-full rounded-full">
                <Link href="/settings/billing">Manage billing &amp; cancellation</Link>
              </Button>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <blockquote className="mx-auto mt-10 max-w-2xl border-l-2 border-border pl-4 text-sm leading-relaxed text-muted-foreground">
        Data is refreshed automatically when needed. Most cards update within 24–72 hours.
      </blockquote>

      <div className="mx-auto mt-12 max-w-xl text-center">
        <p className="text-xs leading-relaxed text-muted-foreground">Cancel anytime. No commitment.</p>
        <p className="mt-2 text-sm text-muted-foreground">
          <Link href="/legal/terms" className="underline underline-offset-4 hover:text-foreground">
            Terms
          </Link>
          <span aria-hidden="true"> · </span>
          <Link href="/legal/privacy" className="underline underline-offset-4 hover:text-foreground">
            Privacy
          </Link>
          <span aria-hidden="true"> · </span>
          <Link href="/legal/refund-policy" className="underline underline-offset-4 hover:text-foreground">
            Refund policy
          </Link>
        </p>
      </div>
    </div>
  );
}
