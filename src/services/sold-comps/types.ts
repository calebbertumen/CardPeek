import type { ConditionBucket } from "@prisma/client";

/** Normalized sold listing from any future provider (eBay, Apify, etc.) */
export type SoldCompListingDTO = {
  title: string;
  /** Source system for this comparable (e.g. "ebay", "mock"). */
  source?: string;
  soldPrice: number;
  soldDate: Date;
  /** Per-listing sold URLs are not stored; keep empty for provider compatibility. */
  listingUrl: string;
  imageUrl?: string | null;
  conditionLabel?: string | null;
  gradeLabel?: string | null;
  rawOrGraded?: string | null;
};

export type SoldCompsFetchInput = {
  cardName: string;
  setName?: string | null;
  cardNumber?: string | null;
  conditionBucket: ConditionBucket;
  /** Stable key for deterministic mocks / provider dedupe */
  cacheKey: string;
};

export type SoldCompsProvider = {
  fetchRecentSold(input: SoldCompsFetchInput): Promise<SoldCompListingDTO[]>;
};
