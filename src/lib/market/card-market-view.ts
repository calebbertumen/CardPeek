import type { ConditionBucket } from "@prisma/client";

export type CardMarketView = {
  card: {
    id: string;
    name: string;
    setName: string | null;
    cardNumber: string | null;
    imageSmall: string;
    imageLarge: string;
    normalizedCardKey: string;
  };
  conditionBucket: ConditionBucket;
  avgPrice: number;
  /** When present, indicates the average excluded outlier sale prices. */
  avgExcludedPrices?: number[] | null;
  medianPrice: number;
  lowPrice: number;
  highPrice: number;
  listingsCount: number;
  lastUpdated: Date;
  isStale: boolean;
  /**
   * True when this response queued a new sold scrape (client may poll). Not set for unrelated in-flight jobs
   * while cached results are shown.
   */
  isRefreshing: boolean;
  /** True when this request queued a new scrape (vs refresh already pending) — UI can vary the “updating” copy. */
  showFetchingBanner: boolean;
  /** When the last Apify run failed; estimate may still reflect an older successful scrape. */
  lastScrapeError?: string | null;
  /** Keyword sent to eBay / Apify for the cached sold snapshot (same string as the link we build for “search on eBay”). */
  ebaySearchKeyword: string | null;
  /** Starter only: lifetime updated card lookups usage. Null for Collector/Preview. */
  freeUpdatedLookups: null | { limit: number; used: number; remaining: number };
  listings: Array<{
    title: string;
    source: string;
    soldPrice: number;
    soldDate: Date;
    /** Always empty; per-listing sold URLs are not stored. */
    listingUrl: string;
    conditionLabel: string | null;
    gradeLabel: string | null;
    rawOrGraded: string | null;
    position: number;
  }>;
};

