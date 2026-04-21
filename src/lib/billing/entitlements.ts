import type { AccessTier } from "@/lib/billing/access";

export type Entitlements = {
  tier: AccessTier;
  /** Daily search allowance (Starter: 7; Collector: high soft cap, “effectively unlimited”). */
  searchesPerDay: number;
  /** Enforced ceiling per UTC day (Collector uses a high safety cap). */
  searchesPerDaySoftCap: number;
  /** Preview mode: total searches before signup wall (null for logged-in tiers). */
  previewSearchesTotalLimit: number | null;
  recentSalesVisibleCount: number;
  canTriggerRefresh: boolean;
  canUseFilters: boolean;
  canSeeExtendedHistory: boolean;
  historyPeriodsDays: number[];
};

export const ENTITLEMENTS_BY_TIER: Record<AccessTier, Entitlements> = {
  preview: {
    tier: "preview",
    searchesPerDay: 0,
    searchesPerDaySoftCap: 0,
    previewSearchesTotalLimit: 2,
    recentSalesVisibleCount: 0,
    canTriggerRefresh: false,
    canUseFilters: false,
    canSeeExtendedHistory: false,
    historyPeriodsDays: [],
  },
  starter: {
    tier: "starter",
    /** Cache-backed searches are unlimited; `enforceAndRecordDailySearch` skips Starter. Fresh scrapes: 3 lifetime (see `product-config` + Prisma). */
    searchesPerDay: 10_000,
    searchesPerDaySoftCap: 10_000,
    previewSearchesTotalLimit: null,
    recentSalesVisibleCount: 0,
    canTriggerRefresh: false,
    canUseFilters: false,
    canSeeExtendedHistory: false,
    historyPeriodsDays: [],
  },
  collector: {
    tier: "collector",
    /** “Effectively unlimited”  -  high backend cap to prevent abuse. */
    searchesPerDay: 10_000,
    searchesPerDaySoftCap: 10_000,
    previewSearchesTotalLimit: null,
    recentSalesVisibleCount: 5,
    canTriggerRefresh: true,
    canUseFilters: true,
    canSeeExtendedHistory: true,
    historyPeriodsDays: [7, 30],
  },
};

export function getTierEntitlements(tier: AccessTier): Entitlements {
  return ENTITLEMENTS_BY_TIER[tier];
}

