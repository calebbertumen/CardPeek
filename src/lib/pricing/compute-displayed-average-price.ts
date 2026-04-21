export type PriceComputationResult = {
  displayedAveragePrice: number | null;
  pricingMethod:
    | "single"
    | "mean_2"
    | "mean_3"
    | "trimmed_mean_4"
    | "trimmed_mean_5"
    | "outlier_trim_high_3"
    | "outlier_trim_low_3"
    | "none";
  /** Count of valid prices after sanitization. */
  listingCount: number;
  /** Prices that were included in the displayed average calculation. */
  includedPrices: number[];
  /** Prices excluded by the averaging rule (e.g. trimmed ends for 5 listings). */
  excludedPrices: number[];
};

function roundUsd(amount: number): number {
  return Math.round(amount * 100) / 100;
}

function sanitizePrices(prices: number[]): number[] {
  return prices.filter((p) => Number.isFinite(p) && p > 0);
}

/** True when the displayed average intentionally ignores at least one stored comp. */
export function averageExcludesSomeListings(method: PriceComputationResult["pricingMethod"]): boolean {
  return (
    method === "trimmed_mean_5" ||
    method === "trimmed_mean_4" ||
    method === "outlier_trim_high_3" ||
    method === "outlier_trim_low_3"
  );
}

/**
 * Compute a currency-friendly displayed average from recent sold prices with lightweight
 * outlier protection: trims extremes at 4 to 5 comps, and trims a single obvious outlier at 3 comps.
 */
export function computeDisplayedAveragePrice(prices: number[]): PriceComputationResult {
  const valid = sanitizePrices(prices);
  const n = valid.length;

  /** Upstream should cap at 5; if not, only the first five comps participate (matches CardPeek snapshots). */
  if (n > 5) {
    return computeDisplayedAveragePrice(valid.slice(0, 5));
  }

  if (n === 0) {
    return {
      displayedAveragePrice: null,
      pricingMethod: "none",
      listingCount: 0,
      includedPrices: [],
      excludedPrices: [],
    };
  }

  if (n === 1) {
    return {
      displayedAveragePrice: roundUsd(valid[0]!),
      pricingMethod: "single",
      listingCount: 1,
      includedPrices: [valid[0]!],
      excludedPrices: [],
    };
  }

  // For 5 listings: trim the extremes.
  if (n === 5) {
    const sorted = [...valid].sort((a, b) => a - b);
    const excludedPrices = [sorted[0]!, sorted[4]!];
    const includedPrices = sorted.slice(1, 4);
    const avg = includedPrices.reduce((a, b) => a + b, 0) / includedPrices.length;
    return {
      displayedAveragePrice: roundUsd(avg),
      pricingMethod: "trimmed_mean_5",
      listingCount: 5,
      includedPrices,
      excludedPrices,
    };
  }

  // For 4 listings: trim lowest & highest (same spirit as the 5-sale rule  -  one bad comp hurts the mean).
  if (n === 4) {
    const sorted = [...valid].sort((a, b) => a - b);
    const excludedPrices = [sorted[0]!, sorted[3]!];
    const includedPrices = sorted.slice(1, 3);
    const avg = includedPrices.reduce((a, b) => a + b, 0) / includedPrices.length;
    return {
      displayedAveragePrice: roundUsd(avg),
      pricingMethod: "trimmed_mean_4",
      listingCount: 4,
      includedPrices,
      excludedPrices,
    };
  }

  // For 3 listings: drop a single clearly-separated outlier when the gaps say so.
  if (n === 3) {
    const sorted = [...valid].sort((a, b) => a - b);
    const [a, b, c] = sorted;
    const leftGap = b - a;
    const rightGap = c - b;
    const mid = b;
    const minMaterial = Math.max(mid * 0.05, 0.5);

    if (rightGap > 2.5 * Math.max(leftGap, minMaterial) && rightGap > mid * 0.15) {
      const includedPrices = [a, b];
      const avg = (a + b) / 2;
      return {
        displayedAveragePrice: roundUsd(avg),
        pricingMethod: "outlier_trim_high_3",
        listingCount: 3,
        includedPrices,
        excludedPrices: [c],
      };
    }

    if (leftGap > 2.5 * Math.max(rightGap, minMaterial) && leftGap > mid * 0.15) {
      const includedPrices = [b, c];
      const avg = (b + c) / 2;
      return {
        displayedAveragePrice: roundUsd(avg),
        pricingMethod: "outlier_trim_low_3",
        listingCount: 3,
        includedPrices,
        excludedPrices: [a],
      };
    }

    const sum = a + b + c;
    const avg = sum / 3;
    return {
      displayedAveragePrice: roundUsd(avg),
      pricingMethod: "mean_3",
      listingCount: 3,
      includedPrices: [...sorted],
      excludedPrices: [],
    };
  }

  // n === 2: simple mean of both (too little signal to trim safely).
  const sum = valid[0]! + valid[1]!;
  const avg = sum / 2;
  return {
    displayedAveragePrice: roundUsd(avg),
    pricingMethod: "mean_2",
    listingCount: 2,
    includedPrices: [...valid],
    excludedPrices: [],
  };
}

