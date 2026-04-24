import type { ConditionBucket } from "@prisma/client";

/** `strict_bucket`: map + filter to the selected condition. `broad_raw_lane`: keep raw-lane hygiene only (no bucket filter). */
export type SoldListingMappingMode = "strict_bucket" | "broad_raw_lane";

export type ScrapedSoldListing = {
  title: string;
  soldPrice: number;
  soldAt: Date;
  /** Used only while normalizing Apify rows; not persisted. */
  itemUrl?: string | null;
  itemId?: string | null;
  imageUrl?: string | null;
  conditionLabel?: string | null;
  raw?: unknown;
};

/** Candidate row from Apify before / after HTML trust checks  -  used by sold-listing filters. */
export type SoldListingCandidate = ScrapedSoldListing;

export type ScrapedCardSnapshot = {
  normalizedCardIdentifier: string;
  displayName?: string | null;
  /** Up to 5 most recent valid (trustworthy) sold listings from the scrape. */
  soldListings: ScrapedSoldListing[];
  averagePrice: number;
  medianPrice: number;
  minPrice: number;
  maxPrice: number;
  scrapedAt: Date;
};

export type ScrapingProvider = {
  scrapeSoldSnapshot(input: {
    normalizedCardIdentifier: string;
    queryText: string;
    conditionBucket: ConditionBucket;
    /** For Apify metrics / dedupe logging only. */
    cacheKey?: string;
    listingMappingMode?: SoldListingMappingMode;
  }): Promise<ScrapedCardSnapshot>;
};

