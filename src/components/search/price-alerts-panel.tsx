"use client";

import { useId } from "react";
import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { Lock } from "lucide-react";
import { createAlertAction, type CreateAlertState } from "@/actions/price-alerts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AccessTier } from "@/lib/billing/access";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="rounded-full" disabled={pending}>
      {pending ? "Saving…" : "Create alert"}
    </Button>
  );
}

export function PriceAlertsPanel(props: { tier: AccessTier; cardId: string }) {
  const [state, formAction] = useFormState<CreateAlertState | null, FormData>(createAlertAction, null);
  const targetPriceFieldId = useId();

  if (props.tier !== "collector") {
    const primary =
      props.tier === "preview"
        ? "Create a free account to unlock alerts when a matching listing is found below your target price."
        : "Get notified when this card hits your target price. Upgrade to Collector to enable alerts.";
    const ctaHref = props.tier === "preview" ? "/register?callbackUrl=/search" : "/pricing";
    const ctaLabel = props.tier === "preview" ? "Create free account" : "Upgrade to Collector";
    return (
      <Card className="border-border/70 bg-surface-alt/20 shadow-sm shadow-black/20">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Lock className="h-4 w-4 text-muted-foreground" aria-hidden />
            Deal alerts
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">{primary}</p>
          <p className="text-xs text-muted-foreground">
            Listings are checked periodically. Notifications are sent when matching deals are found during updates and may not
            reflect real-time listings.
          </p>
          <Button asChild variant="outline" className="w-full rounded-full">
            <Link href={ctaHref}>{ctaLabel}</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/70 shadow-sm shadow-black/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Deal alerts</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-foreground">
          Get notified when a matching listing is found below your target price (price + shipping when available).
        </p>
        <p className="text-xs text-muted-foreground">
          Listings are checked periodically. Notifications are sent when matching deals are found during updates and may not
          reflect real-time listings.
        </p>

        <form action={formAction} className="flex flex-col gap-2">
          <input type="hidden" name="cardId" value={props.cardId} />
          <div className="flex flex-col gap-1.5 sm:flex-row sm:items-end sm:gap-2">
            <div className="min-w-0 flex-1 space-y-1.5">
              <Label htmlFor={targetPriceFieldId} className="text-xs text-muted-foreground">
                Target price (USD)
              </Label>
              <Input
                id={targetPriceFieldId}
                name="targetPrice"
                inputMode="decimal"
                placeholder="e.g. 95"
                className="h-10"
                autoComplete="off"
              />
            </div>
            <SubmitButton />
          </div>

          {state?.message ? (
            <p className={state.ok ? "text-xs text-primary" : "text-xs text-destructive"}>{state.message}</p>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}

