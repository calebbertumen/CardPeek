"use server";

import { auth } from "@/lib/auth";
import { getUserPlanId } from "@/lib/billing/get-user-plan";
import { getTierEntitlements } from "@/lib/billing/entitlements";
import { upsertWatchlistDealTarget } from "@/services/watchlist-target.service";

export type CreateAlertState =
  | { ok: true; message: string }
  | { ok: false; message: string };

export async function createAlertAction(_prev: CreateAlertState | null, formData: FormData): Promise<CreateAlertState> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { ok: false, message: "Please sign in to create alerts." };

  const planId = await getUserPlanId(userId);
  const entitlements = getTierEntitlements(planId);
  if (!entitlements.canUseAlerts) {
    return { ok: false, message: "Upgrade to Collector to unlock deal alerts on matching listings." };
  }

  const limit = entitlements.watchlistLimit;
  if (limit == null || limit <= 0) {
    return { ok: false, message: "Watchlist is not available for your plan." };
  }

  const cardId = formData.get("cardId")?.toString();
  const targetRaw = formData.get("targetPrice")?.toString();
  const targetPrice = targetRaw ? Number(targetRaw) : NaN;

  if (!cardId) return { ok: false, message: "Missing card." };
  if (!Number.isFinite(targetPrice) || targetPrice <= 0) return { ok: false, message: "Enter a valid target price." };

  const res = await upsertWatchlistDealTarget({
    userId,
    cardId,
    targetPrice,
    watchlistLimit: limit,
  });

  if (!res.ok) return { ok: false, message: res.message };
  return {
    ok: true,
    message: "Alert saved. We’ll notify you when a matching listing is found at or below your target.",
  };
}

