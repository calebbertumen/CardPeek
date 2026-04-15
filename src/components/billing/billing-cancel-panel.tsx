"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { CollectorRefundEligibilityResult } from "@/lib/billing/collector-refund-eligibility";
import { formatSubscriptionPeriodEndDate } from "@/lib/format";

export type BillingCancelPanelProps = {
  isCollector: boolean;
  refundEligibility: CollectorRefundEligibilityResult;
  refundDeadline: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
};

type Props = BillingCancelPanelProps;

function formatPeriodDate(d: Date | null): string | null {
  if (!d) return null;
  return formatSubscriptionPeriodEndDate(d);
}

export function BillingCancelPanel({
  isCollector,
  refundEligibility,
  refundDeadline,
  currentPeriodEnd,
  cancelAtPeriodEnd,
}: Props) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"refund" | "period" | null>(null);

  const periodLabel = formatPeriodDate(currentPeriodEnd);
  const deadlineLabel = refundDeadline
    ? refundDeadline.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
    : null;

  async function submitCancel() {
    const intent = mode === "refund" ? "refund" : "period_end";
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/cancel-collector", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent }),
      });
      const json = (await res.json()) as {
        error?: string;
        message?: string;
        refunded?: boolean;
      };
      if (!res.ok) {
        setError(json.error ?? "Request failed.");
        return;
      }
      dialogRef.current?.close();
      router.refresh();
      if (json.message) {
        alert(json.message);
      }
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setPending(false);
      setMode(null);
    }
  }

  if (!isCollector) {
    return (
      <p className="text-sm text-muted-foreground">
        You’re on the free Starter plan. Upgrade on the{" "}
        <a href="/pricing" className="font-medium text-primary underline underline-offset-4">
          pricing page
        </a>{" "}
        to subscribe to Collector.
      </p>
    );
  }

  const eligible = refundEligibility.eligible;

  return (
    <Card className="border-border/80 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg">Cancel Collector</CardTitle>
        <CardDescription>
          Cancel anytime. See our{" "}
          <Link href="/legal/refund-policy" className="font-medium text-foreground underline underline-offset-4">
            refund policy
          </Link>{" "}
          and{" "}
          <Link href="/legal/terms" className="font-medium text-foreground underline underline-offset-4">
            terms
          </Link>
          .
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {cancelAtPeriodEnd ? (
          <div className="space-y-2 rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm">
            <p className="font-medium text-foreground">Subscription cancelled</p>
            <p className="text-muted-foreground">
              Collector remains active until{" "}
              <strong className="text-foreground">{periodLabel ?? "the end of your billing period"}</strong>{" "}
              (end of the current cycle). You won&apos;t be charged again.
            </p>
          </div>
        ) : eligible ? (
          <div className="space-y-2 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
            <p className="font-medium text-foreground">You are eligible for a full refund if you cancel now.</p>
            {deadlineLabel ? (
              <p className="text-muted-foreground">
                Refund window ends: <strong className="text-foreground">{deadlineLabel}</strong>
              </p>
            ) : null}
          </div>
        ) : (
          <p className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm text-foreground">
            {periodLabel ? (
              <>
                Your subscription will remain active until <strong>{periodLabel}</strong>. No refund will be issued.
                <span className="mt-1 block text-xs text-muted-foreground">{refundEligibility.reason}</span>
              </>
            ) : (
              <>{refundEligibility.reason}</>
            )}
          </p>
        )}

        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-3">
          {eligible && !cancelAtPeriodEnd ? (
            <Button
              type="button"
              variant="destructive"
              className="rounded-full"
              disabled={pending}
              onClick={() => {
                setMode("refund");
                dialogRef.current?.showModal();
              }}
            >
              Cancel and refund
            </Button>
          ) : null}
          {!cancelAtPeriodEnd ? (
            <Button
              type="button"
              variant={eligible ? "outline" : "default"}
              className="rounded-full"
              disabled={pending}
              onClick={() => {
                setMode("period");
                dialogRef.current?.showModal();
              }}
            >
              Cancel at period end
            </Button>
          ) : null}
        </div>

        <dialog
          ref={dialogRef}
          className="fixed left-1/2 top-1/2 z-50 w-[min(100%,28rem)] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-background p-6 shadow-xl backdrop:bg-black/60"
        >
          <h3 className="text-lg font-semibold text-foreground">
            {mode === "refund" ? "Cancel and refund" : "Cancel subscription"}
          </h3>
          <p className="mt-3 text-sm text-muted-foreground">
            {mode === "refund"
              ? "You will receive a full refund and lose access immediately."
              : periodLabel
                ? `You will retain access until ${periodLabel}. No refund will be issued.`
                : "You will retain access until the end of your current billing period. No refund will be issued."}
          </p>
          <div className="mt-6 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              disabled={pending}
              onClick={() => dialogRef.current?.close()}
            >
              Back
            </Button>
            <Button
              type="button"
              className="rounded-full"
              variant={mode === "refund" ? "destructive" : "default"}
              disabled={pending}
              onClick={() => void submitCancel()}
            >
              {pending ? "Working…" : mode === "refund" ? "Confirm refund" : "Confirm cancellation"}
            </Button>
          </div>
        </dialog>
      </CardContent>
    </Card>
  );
}
