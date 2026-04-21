import { describe, expect, it } from "vitest";
import {
  buildBuyerSummaryLine,
  buildMarketSignalLine,
  shouldShowWideSpreadClarification,
} from "./pricing-snapshot-copy";

describe("shouldShowWideSpreadClarification", () => {
  it("returns true when raw range is large vs headline", () => {
    expect(
      shouldShowWideSpreadClarification({
        avgPrice: 1273,
        medianPrice: 1200,
        lowPrice: 70,
        highPrice: 1850,
        fairPriceLow: 1100,
        fairPriceHigh: 1350,
        listingsCount: 5,
      }),
    ).toBe(true);
  });

  it("returns false for tight comps", () => {
    expect(
      shouldShowWideSpreadClarification({
        avgPrice: 42,
        medianPrice: 41,
        lowPrice: 38,
        highPrice: 46,
        fairPriceLow: 39,
        fairPriceHigh: 44,
        listingsCount: 5,
      }),
    ).toBe(false);
  });
});

describe("buildBuyerSummaryLine", () => {
  it("uses fair band when multiple listings", () => {
    const s = buildBuyerSummaryLine({ fairPriceLow: 100, fairPriceHigh: 120, listingsCount: 3 });
    expect(s).toMatch(/\$100/);
    expect(s).toMatch(/\$120/);
  });

  it("handles single listing", () => {
    expect(buildBuyerSummaryLine({ fairPriceLow: 10, fairPriceHigh: 10, listingsCount: 1 })).toContain("one recent");
  });
});

describe("buildMarketSignalLine", () => {
  it("prefers volatile when trend is volatile", () => {
    const s = buildMarketSignalLine({
      showWideSpread: false,
      confidence: "high",
      trend: "volatile",
    });
    expect(s).toContain("don’t agree");
  });
});
