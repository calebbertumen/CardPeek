/**
 * Tunable weights for sold-comp scoring. Adjust here only — avoid scattering magic numbers.
 */
export const SOLD_COMP_SCORING = {
  maxTotal: 100,
  maxIdentity: 30,
  maxCondition: 25,
  maxQuality: 15,
  maxPriceSanity: 15,
  maxRecency: 10,
  maxSellerConfidence: 5,

  identity: {
    namePresent: 12,
    numberPresent: 8,
    setPresent: 6,
    variantKeyword: 4,
    wrongCard: -15,
    conflictingSet: -10,
    wrongNumber: -10,
    lotBundleHint: -8,
    /** Below this (after clamping to 0..maxIdentity), drop unless pool is very small. */
    excludeBelowUnlessPoolLt: 3,
    excludeIdentityThreshold: 15,
  },

  priceSanity: {
    /** deviationRatio = abs(price - median) / median */
    bands: [
      { maxRatio: 0.2, points: 15 },
      { maxRatio: 0.35, points: 12 },
      { maxRatio: 0.5, points: 8 },
      { maxRatio: 0.75, points: 4 },
    ] as const,
    outlierHigh: 2.5,
    outlierLow: 0.4,
    /** Need at least this many non-outlier comps before dropping outliers. */
    minCompsBeforeOutlierDrop: 3,
  },

  selection: {
    maxComps: 5,
    usableMinScore: 60,
    weakMinScore: 45,
    /** If fewer than this pass `usableMinScore`, allow `weakMinScore` tier. */
    minUsablePreferred: 3,
  },

  recency: {
    days7: 10,
    days14: 8,
    days30: 6,
    days60: 4,
    days90: 2,
    neutralWhenNoDate: 5,
  },

  sellerConfidence: {
    neutralWhenNoData: 3,
  },
} as const;
