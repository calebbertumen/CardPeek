"use server";

import { cache } from "react";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import {
  ANONYMOUS_COOKIE,
} from "@/lib/constants";
import { searchDefaultsFromUrlParams, type SearchPageFormDefaults } from "@/lib/search-url";
import { normalizeConditionBucket } from "@/lib/normalize";
import { getUserPlanId } from "@/lib/billing/get-user-plan";
import { getCanonicalUserFromSession } from "@/lib/require-db-user";
import type { AccessTier } from "@/lib/billing/access";
import { getTierEntitlements } from "@/lib/billing/entitlements";
import { searchCardMarketData } from "@/services/market-search.service";
import { enforceAndRecordDailySearch } from "@/services/search-usage.service";
import { enforceAndRecordPreviewSearch } from "@/services/preview-usage.service";
import { releaseOrphanedStarterReservation } from "@/services/fresh-scrape-usage.service";
import type { ConditionBucket } from "@prisma/client";

type MarketSearchOk = Extract<Awaited<ReturnType<typeof searchCardMarketData>>, { kind: "ok" }>;

export type SearchCardState =
  | { ok: true; data: MarketSearchOk["data"]; tier: AccessTier }
  | {
      ok: false;
      code: "LIMIT" | "VALIDATION" | "NOT_FOUND" | "NO_DATA" | "UNKNOWN";
      message: string;
      /** Set for daily search limit responses so the UI can show tier-accurate copy. */
      tier?: AccessTier;
      /** When a background scrape was queued but data is not ready yet (NO_DATA). */
      isRefreshing?: boolean;
      showFetchingBanner?: boolean;
    };

/** For `useFormState` — passes through to {@link searchCardAction}. */
export async function searchCardStateAction(
  _prev: SearchCardState | null,
  formData: FormData,
): Promise<SearchCardState | null> {
  return searchCardAction(formData, { debitAnonymousQuota: true });
}

/**
 * Re-run the same search without debiting preview/daily quotas — used to pick up completed background scrapes.
 */
export async function pollCardSearchAction(formData: FormData): Promise<SearchCardState> {
  return searchCardAction(formData, { debitAnonymousQuota: false });
}

type SearchCardActionOptions = {
  /**
   * When false, poll retries skip collector daily increment. Preview quota is applied only after a cache hit
   * (`ok`), including when this flag is false.
   */
  debitAnonymousQuota?: boolean;
};

export async function searchCardAction(
  formData: FormData,
  options: SearchCardActionOptions = {},
): Promise<SearchCardState> {
  const debitAnonymousQuota = options.debitAnonymousQuota !== false;
  const session = await auth();
  const dbUser = await getCanonicalUserFromSession(session);
  const tier: AccessTier = dbUser ? await getUserPlanId(dbUser.id) : "preview";
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
  if (!dbUser && !aid) {
    return { ok: false, code: "UNKNOWN", message: "Missing session. Please refresh the page." };
  }

  // Collector daily cap (anonymous or signed-in collector). Preview: charged only after a cache hit below.
  if (debitAnonymousQuota && tier === "collector") {
    const gate = await enforceAndRecordDailySearch({
      entitlements,
      userId: dbUser?.id ?? null,
      anonymousId: dbUser ? null : aid,
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

  if (tier === "starter" && dbUser) {
    await releaseOrphanedStarterReservation(dbUser.id);
  }

  try {
    const result = await searchCardMarketData({
      name,
      setName,
      cardNumber,
      requestedConditionBucket: conditionBucket,
      entitlements,
      userId: dbUser?.id ?? null,
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
            "There’s no cached market data for this card in preview yet. Create a free account to continue exploring CardPeek.",
        };
      }
      if (tier === "starter") {
        return {
          ok: false,
          code: "NO_DATA",
          tier: "starter",
          message:
            "We don’t have data for this card right now. Try another search, or upgrade to Collector for unlimited searches and unlimited access to updated market data.",
          isRefreshing: result.isRefreshing,
          showFetchingBanner: result.showFetchingBanner,
        };
      }
      return {
        ok: false,
        code: "NO_DATA",
        tier: "collector",
        message:
          "We’re preparing market data for this card. Check back shortly—listings are updated regularly and may not reflect real-time results.",
        isRefreshing: result.isRefreshing,
        showFetchingBanner: result.showFetchingBanner,
      };
    }

    if (tier === "preview" && aid) {
      const limit = entitlements.previewSearchesTotalLimit ?? 2;
      const debitFingerprint = `${result.data.card.normalizedCardKey}__${result.data.conditionBucket}`;
      const gate = await enforceAndRecordPreviewSearch({
        anonymousId: aid,
        limitTotal: limit,
        debitFingerprint,
      });
      if (!gate.ok) {
        return {
          ok: false,
          code: "LIMIT",
          message: "Preview limit reached. Create a free account to keep exploring CardPeek.",
        };
      }
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

/**
 * Same URL query can be evaluated twice in one RSC request (e.g. React Strict Mode). Without deduplication,
 * `searchCardAction` would run twice and preview usage would increment twice for a single page load.
 */
const runSearchFromUrlParamsDeduped = cache(
  async (defaultsKey: string): Promise<SearchCardState | null> => {
    const defaults = JSON.parse(defaultsKey) as SearchPageFormDefaults;
    if (!defaults.name.trim()) return null;
    const fd = new FormData();
    fd.set("name", defaults.name);
    fd.set("setName", defaults.setName);
    fd.set("cardNumber", defaults.cardNumber);
    fd.set("condition", defaults.condition);
    return searchCardAction(fd, { debitAnonymousQuota: true });
  },
);

/** Run the same search as the form when the user lands with `?name=…` query (e.g. from the home page). */
export async function searchFromUrlParams(
  searchParams: Record<string, string | string[] | undefined>,
): Promise<SearchCardState | null> {
  const defaults = searchDefaultsFromUrlParams(searchParams);
  if (!defaults.name.trim()) return null;
  return runSearchFromUrlParamsDeduped(JSON.stringify(defaults));
}
