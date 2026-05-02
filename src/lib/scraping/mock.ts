import type { ScrapedCardSnapshot, ScrapingProvider } from "./types";
import { buildScrapedCardSnapshotFromSoldListings } from "@/lib/pricing/sold-comp-selection";

export const mockScrapingProvider: ScrapingProvider = {
  async scrapeSoldSnapshot({
    normalizedCardIdentifier,
    queryText,
    conditionBucket,
    listingMappingMode,
    pricingCardContext,
  }): Promise<ScrapedCardSnapshot> {
    void listingMappingMode;
    const now = new Date();
    const base = Math.abs(
      Array.from(normalizedCardIdentifier).reduce((a, c) => a + c.charCodeAt(0), 0) % 60,
    );
    const prices = [base + 80, base + 92, base + 85, base + 88, base + 90, base + 83, base + 87, base + 91].map((n) =>
      Math.round(n * 100) / 100,
    );
    const soldListings = prices.map((p, i) => ({
      title: `${queryText} #1 Near Mint sold listing ${i + 1}`,
      soldPrice: p,
      soldAt: new Date(now.getTime() - i * 86_400_000),
      itemUrl: "https://www.ebay.com/itm/123456789012",
      itemId: "123456789012",
      imageUrl: null,
      raw: null,
    }));
    const ctx =
      pricingCardContext ??
      ({
        name: queryText.split(/\s+/)[0] ?? queryText,
        setName: null,
        cardNumber: "1",
        conditionBucket,
      } as const);
    return buildScrapedCardSnapshotFromSoldListings({
      normalizedCardIdentifier,
      displayName: queryText,
      listings: soldListings,
      context: ctx,
    });
  },
};

