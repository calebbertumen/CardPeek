import type {
  ScrapedCardSnapshot,
  ScrapingProvider,
} from "./types";
import { computeDisplayedAveragePrice } from "@/lib/pricing/compute-displayed-average-price";

function computeStats(prices: number[]) {
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const avg = computeDisplayedAveragePrice(prices).displayedAveragePrice ?? 0;
  const s = [...prices].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  const median = s.length % 2 === 0 ? (s[mid - 1]! + s[mid]!) / 2 : s[mid]!;
  return { min, max, avg, median };
}

export const mockScrapingProvider: ScrapingProvider = {
  async scrapeSoldSnapshot({ normalizedCardIdentifier, queryText, conditionBucket }): Promise<ScrapedCardSnapshot> {
    void conditionBucket;
    const now = new Date();
    const base = Math.abs(
      Array.from(normalizedCardIdentifier).reduce((a, c) => a + c.charCodeAt(0), 0) % 60,
    );
    const prices = [base + 80, base + 92, base + 85, base + 88, base + 90].map((n) =>
      Math.round(n * 100) / 100,
    );
    const { min, max, avg, median } = computeStats(prices);
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
      medianPrice: Math.round(median * 100) / 100,
      minPrice: Math.round(min * 100) / 100,
      maxPrice: Math.round(max * 100) / 100,
      scrapedAt: now,
    };
  },
};

