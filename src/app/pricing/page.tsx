import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getPlan } from "@/lib/billing/plans";
import { auth } from "@/lib/auth";
import { getUserPlanId } from "@/lib/billing/get-user-plan";
import { StripeCheckoutButton } from "@/components/billing/stripe-checkout-button";

export const metadata: Metadata = {
  title: "Pricing",
};

async function CheckoutButton() {
  const session = await auth();
  if (!session?.user?.id) {
    return (
      <Button asChild className="w-full rounded-full">
        <Link href="/register?callbackUrl=/pricing">Create free account</Link>
      </Button>
    );
  }

  const planId = await getUserPlanId(session.user.id);
  if (planId === "collector") {
    return (
      <Button
        className="w-full rounded-full"
        formAction={async () => {
          "use server";
        }}
        disabled
      >
        Collector active
      </Button>
    );
  }

  return <StripeCheckoutButton>Start tracking deals</StripeCheckoutButton>;
}

export default async function PricingPage() {
  const collector = getPlan("collector");
  return (
    <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6">
      <div className="text-center">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Two simple tiers</h1>
        <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
          Based on recent market sales. Updated periodically. Data may not reflect real-time listings.
        </p>
      </div>

      <div className="mt-12 grid gap-6 md:grid-cols-2">
        <Card className="border-border/80 shadow-md shadow-black/25">
          <CardHeader>
            <CardTitle className="text-xl">Starter</CardTitle>
            <CardDescription>Quick card value checks with reliable market data.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-4xl font-semibold tracking-tight text-primary">$0</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• 7 searches/day</li>
              <li>• Average price (based on recent sold listings)</li>
              <li>• Price range insights</li>
              <li>• View 3 recent sold listings</li>
              <li>• Track up to 3 cards</li>
              <li>• Access recent market data</li>
              <li>• Limited live data lookups</li>
            </ul>
            <Button asChild className="w-full rounded-full">
              <Link href="/search">Start searching</Link>
            </Button>
            <p className="text-xs text-muted-foreground">
              Data is sourced from recent market activity and updated periodically.
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-md shadow-black/25">
          <CardHeader>
            <CardTitle className="text-xl">Collector</CardTitle>
            <CardDescription>Full market visibility and smarter deal tracking.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-4xl font-semibold tracking-tight text-primary">${collector.priceMonthlyUsd.toFixed(2)}/mo</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• High search allowance</li>
              <li>• Average price + full price range insights</li>
              <li>• View all recent sold listings</li>
              <li>• Priority access to updated market data</li>
              <li>• Refresh data anytime</li>
              <li>• Get notified when listings match your target price</li>
              <li>• Track up to 25 cards</li>
            </ul>
            <div id="checkout" />
            {await CheckoutButton()}
            <p className="text-xs text-muted-foreground">
              Listings are updated regularly. Priority access ensures faster and more complete data.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
