import { describe, expect, it } from "vitest";
import { buildMarketSnapshotInsights } from "./market-snapshot-insights";

const d = (iso: string) => new Date(iso);

function listingsFromPrices(prices: number[]) {
  return prices.map((soldPrice, i) => ({
    soldPrice,
    soldDate: d(`2024-06-${String(i + 1).padStart(2, "0")}T12:00:00Z`),
    position: i + 1,
  }));
}

describe("buildMarketSnapshotInsights", () => {
  it("computes decision bands and high confidence for tight comps", () => {
    const rows = listingsFromPrices([40, 41, 40.5, 41.2, 40.8]);
    const out = buildMarketSnapshotInsights({
      listings: rows,
      snapshotLow: 40,
      snapshotHigh: 41.2,
      priorScrapeAvgPrice: null,
    });
    expect(out).not.toBeNull();
    expect(out!.confidence).toBe("high");
    expect(out!.goodDealUnder).toBeLessThanOrEqual(out!.fairPriceLow);
    expect(out!.sellTarget).toBeGreaterThanOrEqual(41.2);
    expect(out!.explainLine.toLowerCase()).toContain("ebay");
    expect(out!.explainLine.toLowerCase()).toContain("sold");
  });

  it("flags volatile when recent slice disagrees with prior snapshot", () => {
    const rows = listingsFromPrices([10, 10, 10, 50, 50]);
    const out = buildMarketSnapshotInsights({
      listings: rows,
      snapshotLow: 10,
      snapshotHigh: 50,
      priorScrapeAvgPrice: 12,
    });
    expect(out!.trend).toBe("volatile");
  });

  it("returns null when no listings", () => {
    expect(
      buildMarketSnapshotInsights({
        listings: [],
        snapshotLow: 0,
        snapshotHigh: 0,
        priorScrapeAvgPrice: null,
      }),
    ).toBeNull();
  });
});
