import type {
  ScrapedActiveSnapshot,
  ScrapedCardSnapshot,
  ScrapingProvider,
} from "./types";

function computeStats(prices: number[]) {
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
  return { min, max, avg };
}

export const mockScrapingProvider: ScrapingProvider = {
  async scrapeSoldSnapshot({ normalizedCardIdentifier, queryText }): Promise<ScrapedCardSnapshot> {
    const now = new Date();
    const base = Math.abs(
      Array.from(normalizedCardIdentifier).reduce((a, c) => a + c.charCodeAt(0), 0) % 60,
    );
    const prices = [base + 80, base + 92, base + 85, base + 88, base + 90].map((n) =>
      Math.round(n * 100) / 100,
    );
    const { min, max, avg } = computeStats(prices);
    const soldListings = prices.map((p, i) => ({
      title: `${queryText} — sold listing ${i + 1}`,
      soldPrice: p,
      soldAt: new Date(now.getTime() - i * 86_400_000),
      itemUrl: "https://www.ebay.com/",
      itemId: null,
      imageUrl: null,
      raw: null,
    }));
    return {
      normalizedCardIdentifier,
      displayName: queryText,
      soldListings,
      averagePrice: Math.round(avg * 100) / 100,
      minPrice: Math.round(min * 100) / 100,
      maxPrice: Math.round(max * 100) / 100,
      scrapedAt: now,
    };
  },

  async scrapeActiveListings({ normalizedCardIdentifier, queryText, maxItems }): Promise<ScrapedActiveSnapshot> {
    const now = new Date();
    const base = Math.abs(
      Array.from(normalizedCardIdentifier).reduce((a, c) => a + c.charCodeAt(0), 0) % 40,
    );
    const n = Math.min(Math.max(maxItems, 1), 20);
    const listings = Array.from({ length: n }, (_, i) => {
      const price = base + 50 + i * 2;
      const ship = i % 2 === 0 ? 4.99 : 0;
      return {
        title: `${queryText} — BIN ${i + 1}`,
        price,
        shippingPrice: ship,
        currency: "USD",
        listingUrl: "https://www.ebay.com/",
        itemId: `mock-${normalizedCardIdentifier.slice(0, 8)}-${i}`,
        sellerLabel: "mock-seller",
        isBuyItNow: true,
        raw: null,
      };
    });
    return { normalizedCardIdentifier, listings, scrapedAt: now };
  },
};

