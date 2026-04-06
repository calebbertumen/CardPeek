import type { AccessTier } from "@/lib/billing/access";
import {
  COLLECTOR_WATCHLIST_LIMIT,
  STARTER_DAILY_SEARCH_LIMIT,
  STARTER_WATCHLIST_LIMIT,
} from "@/lib/billing/product-config";

export type Entitlements = {
  tier: AccessTier;
  /** Daily search allowance (Starter: 7; Collector: high soft cap, “effectively unlimited”). */
  searchesPerDay: number;
  /** Enforced ceiling per UTC day (Collector uses a high safety cap). */
  searchesPerDaySoftCap: number;
  /** Preview mode: total searches before signup wall (null for logged-in tiers). */
  previewSearchesTotalLimit: number | null;
  recentSalesVisibleCount: number;
  /** Max cards a user can track on the watchlist (Starter 3, Collector 25). */
  watchlistLimit: number | null; // null = unused (all tiers use numeric caps today)
  canTriggerRefresh: boolean;
  canUseFilters: boolean;
  canUseAlerts: boolean;
  maxActiveAlerts: number;
  canSeeExtendedHistory: boolean;
  historyPeriodsDays: number[];
};

export const ENTITLEMENTS_BY_TIER: Record<AccessTier, Entitlements> = {
  preview: {
    tier: "preview",
    searchesPerDay: 0,
    searchesPerDaySoftCap: 0,
    previewSearchesTotalLimit: 2,
    recentSalesVisibleCount: 1,
    watchlistLimit: 0,
    canTriggerRefresh: false,
    canUseFilters: false,
    canUseAlerts: false,
    maxActiveAlerts: 0,
    canSeeExtendedHistory: false,
    historyPeriodsDays: [],
  },
  starter: {
    tier: "starter",
    searchesPerDay: STARTER_DAILY_SEARCH_LIMIT,
    searchesPerDaySoftCap: STARTER_DAILY_SEARCH_LIMIT,
    previewSearchesTotalLimit: null,
    recentSalesVisibleCount: 3,
    watchlistLimit: STARTER_WATCHLIST_LIMIT,
    canTriggerRefresh: false,
    canUseFilters: false,
    canUseAlerts: false,
    maxActiveAlerts: 0,
    canSeeExtendedHistory: false,
    historyPeriodsDays: [],
  },
  collector: {
    tier: "collector",
    /** “Effectively unlimited” — high backend cap to prevent abuse. */
    searchesPerDay: 10_000,
    searchesPerDaySoftCap: 10_000,
    previewSearchesTotalLimit: null,
    recentSalesVisibleCount: 5,
    watchlistLimit: COLLECTOR_WATCHLIST_LIMIT,
    canTriggerRefresh: true,
    canUseFilters: true,
    canUseAlerts: true,
    /** Matches “track up to 25 cards” + target-price alerts. */
    maxActiveAlerts: 25,
    canSeeExtendedHistory: true,
    historyPeriodsDays: [7, 30],
  },
};

export function getTierEntitlements(tier: AccessTier): Entitlements {
  return ENTITLEMENTS_BY_TIER[tier];
}

