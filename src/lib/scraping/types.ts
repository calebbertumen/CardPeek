export type ScrapedSoldListing = {
  title: string;
  soldPrice: number;
  soldAt: Date;
  itemUrl?: string | null;
  itemId?: string | null;
  imageUrl?: string | null;
  raw?: unknown;
};

export type ScrapedCardSnapshot = {
  normalizedCardIdentifier: string;
  displayName?: string | null;
  soldListings: ScrapedSoldListing[]; // must be exactly 5 for MVP
  averagePrice: number;
  minPrice: number;
  maxPrice: number;
  scrapedAt: Date;
};

/** Active listing row (MVP: Buy It Now only). */
export type ScrapedActiveListing = {
  title: string;
  price: number;
  shippingPrice?: number | null;
  currency?: string;
  listingUrl: string;
  itemId?: string | null;
  sellerLabel?: string | null;
  isBuyItNow?: boolean;
  raw?: unknown;
};

export type ScrapedActiveSnapshot = {
  normalizedCardIdentifier: string;
  listings: ScrapedActiveListing[];
  scrapedAt: Date;
};

export type ScrapingProvider = {
  scrapeSoldSnapshot(input: {
    normalizedCardIdentifier: string;
    queryText: string;
  }): Promise<ScrapedCardSnapshot>;

  /** BIN-only, capped by provider / env — never unbounded. */
  scrapeActiveListings(input: {
    normalizedCardIdentifier: string;
    queryText: string;
    maxItems: number;
  }): Promise<ScrapedActiveSnapshot>;
};

