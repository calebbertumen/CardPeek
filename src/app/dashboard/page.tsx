import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getUserSubscriptionSummary } from "@/lib/billing/get-user-plan";
import { requireDbUser } from "@/lib/require-db-user";
import { formatSubscriptionPeriodEndDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CollectionPreviewCard } from "@/components/dashboard/collection-preview-card";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?callbackUrl=/dashboard");
  }

  const dbUser = await requireDbUser(session);
  const subscription = await getUserSubscriptionSummary(dbUser.id);

  const scheduleLine =
    subscription.planId === "starter"
      ? "Starter is free—no charges."
      : subscription.planId === "collector"
        ? subscription.cancelAtPeriodEnd && subscription.currentPeriodEnd
          ? `Cancelled — Collector access until ${formatSubscriptionPeriodEndDate(subscription.currentPeriodEnd)}. No further charges.`
          : subscription.currentPeriodEnd
            ? `Renews on ${formatSubscriptionPeriodEndDate(subscription.currentPeriodEnd)}.`
            : "Renewal date will appear here after your subscription is confirmed with Stripe."
        : "";

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Signed in as <span className="font-medium text-foreground">{session.user.email}</span>
        </p>
      </div>

      <div className="mt-10 grid gap-6">
        <Card className="border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Subscription</CardTitle>
            <CardDescription>Your plan and billing schedule.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <dl className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Current tier</dt>
                <dd className="text-base font-semibold text-foreground">{subscription.planName}</dd>
              </div>
              <div className="space-y-1">
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {subscription.planId === "starter"
                    ? "Billing"
                    : subscription.planId === "collector" && subscription.cancelAtPeriodEnd
                      ? "Status"
                      : "Next charge"}
                </dt>
                <dd className="text-sm leading-relaxed text-foreground">{scheduleLine}</dd>
              </div>
            </dl>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" className="rounded-full">
                <Link href="/pricing">View plans</Link>
              </Button>
              {subscription.planId === "collector" ? (
                <Button asChild variant="outline" className="rounded-full">
                  <Link href="/settings/billing">Billing &amp; cancellation</Link>
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <CollectionPreviewCard userId={dbUser.id} />
      </div>
    </div>
  );
}
