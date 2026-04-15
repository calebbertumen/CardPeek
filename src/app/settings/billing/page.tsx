import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getUserBillingState } from "@/lib/billing/get-user-plan";
import { requireDbUser } from "@/lib/require-db-user";
import { BillingCancelPanel } from "@/components/billing/billing-cancel-panel";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Billing settings",
};

export default async function BillingSettingsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?callbackUrl=/settings/billing");
  }

  const dbUser = await requireDbUser(session);
  const billing = await getUserBillingState(dbUser.id);

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Billing</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your Collector subscription and refunds.
          </p>
        </div>
        <Button asChild variant="outline" className="rounded-full">
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
      </div>

      <div className="mt-10 space-y-6">
        <BillingCancelPanel
          isCollector={billing.planId === "collector"}
          refundEligibility={billing.refundEligibility}
          refundDeadline={billing.refundEligibility.refundDeadline}
          currentPeriodEnd={billing.currentPeriodEnd}
          cancelAtPeriodEnd={billing.cancelAtPeriodEnd}
        />

        <p className="text-xs leading-relaxed text-muted-foreground">
          Details:{" "}
          <Link href="/legal/refund-policy" className="font-medium text-foreground underline underline-offset-4">
            Refund policy
          </Link>
          . If something looks wrong, contact support with your account email.
        </p>
      </div>
    </div>
  );
}
