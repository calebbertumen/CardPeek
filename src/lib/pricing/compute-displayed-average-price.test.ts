import { describe, expect, it } from "vitest";
import { computeDisplayedAveragePrice } from "./compute-displayed-average-price";

describe("computeDisplayedAveragePrice", () => {
  it("5 listings: trimmed mean of middle 3", () => {
    const res = computeDisplayedAveragePrice([100, 105, 110, 115, 300]);
    expect(res.pricingMethod).toBe("trimmed_mean_5");
    expect(res.includedPrices).toEqual([105, 110, 115]);
    expect(res.excludedPrices).toEqual([100, 300]);
    expect(res.displayedAveragePrice).toBe(110);
  });

  it("4 listings: mean of all 4", () => {
    const res = computeDisplayedAveragePrice([100, 105, 110, 300]);
    expect(res.pricingMethod).toBe("mean_4");
    expect(res.displayedAveragePrice).toBe(153.75);
    expect(res.includedPrices).toEqual([100, 105, 110, 300]);
    expect(res.excludedPrices).toEqual([]);
  });

  it("3 listings: mean of all 3", () => {
    const res = computeDisplayedAveragePrice([100, 110, 120]);
    expect(res.pricingMethod).toBe("mean_3");
    expect(res.displayedAveragePrice).toBe(110);
  });

  it("2 listings: mean of both", () => {
    const res = computeDisplayedAveragePrice([100, 120]);
    expect(res.pricingMethod).toBe("mean_2");
    expect(res.displayedAveragePrice).toBe(110);
  });

  it("1 listing: single", () => {
    const res = computeDisplayedAveragePrice([99]);
    expect(res.pricingMethod).toBe("single");
    expect(res.displayedAveragePrice).toBe(99);
  });

  it("invalid values are ignored", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = computeDisplayedAveragePrice([100, null as any, undefined as any, NaN, -5, 120]);
    expect(res.pricingMethod).toBe("mean_2");
    expect(res.includedPrices).toEqual([100, 120]);
    expect(res.displayedAveragePrice).toBe(110);
  });

  it("no valid values: none", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = computeDisplayedAveragePrice([null as any, undefined as any, NaN]);
    expect(res.pricingMethod).toBe("none");
    expect(res.displayedAveragePrice).toBeNull();
    expect(res.includedPrices).toEqual([]);
    expect(res.excludedPrices).toEqual([]);
  });
});

