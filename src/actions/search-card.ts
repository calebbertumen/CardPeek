"use server";

import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import {
  ANONYMOUS_COOKIE,
} from "@/lib/constants";
import { searchDefaultsFromUrlParams } from "@/lib/search-url";
import { normalizeConditionBucket } from "@/lib/normalize";
import { getUserPlanId } from "@/lib/billing/get-user-plan";
import type { AccessTier } from "@/lib/billing/access";
import { getTierEntitlements } from "@/lib/billing/entitlements";
import { searchCardMarketData } from "@/services/market-search.service";
import { enforceAndRecordDailySearch } from "@/services/search-usage.service";
import { enforceAndRecordPreviewSearch } from "@/services/preview-usage.service";
import { releaseOrphanedStarterReservation } from "@/services/fresh-scrape-usage.service";
import type { ConditionBucket } from "@prisma/client";

/** Run the same search as the form when the user lands with `?name=…` query (e.g. from the home page). */
export async function searchFromUrlParams(
  searchParams: Record<string, string | string[] | undefined>,
): Promise<SearchCardState | null> {
  const defaults = searchDefaultsFromUrlParams(searchParams);
  const name = defaults.name.trim();
  if (!name) return null;
  const fd = new FormData();
  fd.set("name", name);
  fd.set("setName", defaults.setName);
  fd.set("cardNumber", defaults.cardNumber);
  fd.set("condition", defaults.condition);
  /** Do not debit quota on SSR / URL loads — only explicit form submits count (avoids refresh/remount inflation). */
  return searchCardAction(fd, { debitAnonymousQuota: false });
}

type MarketSearchOk = Extract<Awaited<ReturnType<typeof searchCardMarketData>>, { kind: "ok" }>;

export type SearchCardState =
  | { ok: true; data: MarketSearchOk["data"]; tier: AccessTier }
  | {
      ok: false;
      code: "LIMIT" | "VALIDATION" | "NOT_FOUND" | "NO_DATA" | "UNKNOWN";
      message: string;
      /** Set for daily search limit responses so the UI can show tier-accurate copy. */
      tier?: AccessTier;
    };

/** For `useFormState` — passes through to {@link searchCardAction}. */
export async function searchCardStateAction(
  _prev: SearchCardState | null,
  formData: FormData,
): Promise<SearchCardState | null> {
  return searchCardAction(formData, { debitAnonymousQuota: true });
}

type SearchCardActionOptions = {
  /**
   * When false, a successful search does not increment anonymous usage (SSR / ?name= loads).
   * Quota is still enforced when limits are on — only form submits advance the counter.
   */
  debitAnonymousQuota?: boolean;
};

export async function searchCardAction(
  formData: FormData,
  options: SearchCardActionOptions = {},
): Promise<SearchCardState> {
  const debitAnonymousQuota = options.debitAnonymousQuota !== false;
  const session = await auth();
  const tier: AccessTier = session?.user?.id ? await getUserPlanId(session.user.id) : "preview";
  const entitlements = getTierEntitlements(tier);

  const name = formData.get("name")?.toString().trim();
  const setName = formData.get("setName")?.toString().trim() || undefined;
  const cardNumber = formData.get("cardNumber")?.toString().trim() || undefined;
  const conditionRaw = formData.get("condition")?.toString() ?? "raw_nm";

  if (!name) {
    return { ok: false, code: "VALIDATION", message: "Card name is required." };
  }

  const conditionBucket = normalizeConditionBucket(conditionRaw) as ConditionBucket;

  const jar = await cookies();
  const aid = jar.get(ANONYMOUS_COOKIE)?.value ?? null;
  if (!session?.user?.id && !aid) {
    return { ok: false, code: "UNKNOWN", message: "Missing session. Please refresh the page." };
  }

  // Enforce limits on explicit form submits only (not SSR / URL loads).
  if (debitAnonymousQuota) {
    if (tier === "preview") {
      const limit = entitlements.previewSearchesTotalLimit ?? 2;
      const gate = await enforceAndRecordPreviewSearch({ anonymousId: aid!, limitTotal: limit });
      if (!gate.ok) {
        return {
          ok: false,
          code: "LIMIT",
          message: "Preview limit reached. Create a free account to keep exploring CardPeek.",
        };
      }
    } else if (tier === "collector") {
      // Starter: unlimited cache searches; only lifetime fresh-scrape credits apply (see `fresh-scrape-usage.service`).
      const gate = await enforceAndRecordDailySearch({
        entitlements,
        userId: session?.user?.id ?? null,
        anonymousId: session?.user?.id ? null : aid,
      });
      if (!gate.ok) {
        return {
          ok: false,
          code: "LIMIT",
          tier,
          message: `You’ve reached today’s search limit (${gate.limit.toLocaleString()} searches). Please try again tomorrow.`,
        };
      }
    }
  }

  if (tier === "starter" && session?.user?.id) {
    await releaseOrphanedStarterReservation(session.user.id);
  }

  try {
    const result = await searchCardMarketData({
      name,
      setName,
      cardNumber,
      requestedConditionBucket: conditionBucket,
      entitlements,
      userId: session?.user?.id ?? null,
    });

    if (result.kind === "no_data") {
      if (result.blockedReason === "FREE_LIFETIME_SCRAPE_LIMIT") {
        return {
          ok: false,
          code: "LIMIT",
          tier: "starter",
          message:
            "You’ve used your 3 lifetime fresh data updates. Upgrade to Collector for unlimited access to updated market data (fair use applies).",
        };
      }
      if (tier === "preview") {
        return {
          ok: false,
          code: "NO_DATA",
          tier: "preview",
          message:
            "This card is not available in preview mode yet. Create a free account to continue exploring CardPeek.",
        };
      }
      if (tier === "starter") {
        return {
          ok: false,
          code: "NO_DATA",
          tier: "starter",
          message:
            "We don’t have data for this card right now. Try another search, or upgrade to Collector for unlimited searches and unlimited access to updated market data.",
        };
      }
      return {
        ok: false,
        code: "NO_DATA",
        tier: "collector",
        message:
          "We’re preparing market data for this card. Check back shortly—listings are updated regularly and may not reflect real-time results.",
      };
    }

    return { ok: true, data: result.data, tier };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    if (msg === "CARD_NOT_FOUND") {
      return {
        ok: false,
        code: "NOT_FOUND",
        message: "We couldn’t find that card in the Pokémon TCG catalog. Try adjusting name, set, or number.",
      };
    }
    console.error(e);
    return {
      ok: false,
      code: "UNKNOWN",
      message: "Something went wrong. Please try again.",
    };
  }
}
