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
        <Link href="/register?callbackUrl=/pricing">Create account for Collector</Link>
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

  return <StripeCheckoutButton>Unlock sales</StripeCheckoutButton>;
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
        <p className="mx-auto mt-3 max-w-lg space-y-1 text-muted-foreground">
          <span className="block">Built from recent eBay sold listings, not active listings.</span>
          <span className="block">We store a cleaned snapshot so you get a calmer read than scrolling raw sold results.</span>
        </p>
      </div>

      <p className="mx-auto mt-10 max-w-none text-center text-sm font-medium text-foreground sm:whitespace-nowrap">
        Starter shows a saved snapshot of recent sales. Collector lets you see the sales behind it.
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
                <CardDescription>Quick pricing from a saved snapshot of recent sales.</CardDescription>
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
              <li>• Unlimited searches on saved sold snapshots</li>
              <li>• Includes up to 3 fresh data updates when available</li>
              <li>• Estimate based on recent sold listings</li>
              <li>• Typical range from cleaned recent sales</li>
              <li>• Sold listings hidden (preview only)</li>
              <li>• Track up to 10 cards using Near Mint pricing</li>
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
                <CardDescription>See the sales behind the estimate, with condition filters and full sold listings.</CardDescription>
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
              <p className="mt-1 text-sm text-muted-foreground">See the exact sales behind the estimate.</p>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">Cancel anytime. No commitment.</p>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• See up to 5 recent sales per card (price, date, title)</li>
              <li>• Compare prices across different conditions</li>
              <li>• Filter by condition during search</li>
              <li>• Access fresher sales data when available</li>
              <li>• Track unlimited cards with chosen condition</li>
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
                . Refunds are available within 5 days of your first purchase. See refund policy for details.
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
        Data updates automatically. Most cards refresh within 24 to 72 hours.
      </blockquote>

      <div className="mx-auto mt-12 max-w-xl text-center">
        <p className="text-sm text-muted-foreground">
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
