import type { ConditionBucket } from "@prisma/client";
import { normalizeConditionBucket } from "@/lib/normalize";

export type MockListing = {
  title: string;
  soldPrice: number;
  soldDate: string;
  listingUrl: string;
  conditionLabel: string;
  position: number;
};

export type MockComps = {
  avgPrice: number;
  medianPrice: number;
  lowPrice: number;
  highPrice: number;
  listingsCount: number;
  listings: MockListing[];
};

function hashSeed(key: string): number {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (Math.imul(31, h) + key.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function pseudoRandom(seed: number, i: number): number {
  const x = Math.sin(seed * 9999 + i * 137) * 10000;
  return x - Math.floor(x);
}

/** Deterministic base USD from card name (before condition / variation). */
export function getBasePrice(cardName: string): number {
  const seed = hashSeed(cardName.trim().toLowerCase());
  const t = pseudoRandom(seed, 0);
  const span = 120;
  const floor = 18;
  let base = floor + t * span;
  if (/charizard/i.test(cardName)) {
    base *= 2.15;
  }
  return Math.round(base * 100) / 100;
}

/** Highest psa_10 → lowest raw_mp_hp */
export function getConditionMultiplier(condition: string): number {
  const bucket = normalizeConditionBucket(condition);
  const table: Record<ConditionBucket, number> = {
    psa_10: 3.45,
    psa_9: 2.65,
    psa_8: 1.95,
    raw_nm: 1.25,
    raw_lp: 1.0,
    raw_mp_hp: 0.72,
  };
  return table[bucket];
}

function conditionDisplayLabel(bucket: ConditionBucket): string {
  if (bucket.startsWith("psa")) {
    return bucket.replace("_", " ").toUpperCase();
  }
  switch (bucket) {
    case "raw_nm":
      return "Near Mint";
    case "raw_lp":
      return "Lightly Played";
    case "raw_mp_hp":
      return "Moderately / Heavily Played";
    default:
      return bucket;
  }
}

/** ISO timestamp for (UTC) calendar day offset from today. */
export function generateDate(offsetDays: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - offsetDays);
  d.setUTCHours(17, 30, 0, 0);
  return d.toISOString();
}

const TITLE_SUFFIXES = [
  " — Free Shipping",
  " | Fast Ship",
  " 🔥 Pokémon TCG",
  " (Authentic)",
  " — Sold as Pictured",
];

const TITLE_PREFIXES = ["", "NM ", "MINT ", ""];

export function generateTitle(cardName: string, condition: string, variantIndex: number): string {
  const bucket = normalizeConditionBucket(condition);
  const condPhrase =
    bucket.startsWith("psa") ? bucket.replace("_", " ").toUpperCase() : conditionDisplayLabel(bucket);
  const seed = hashSeed(`${cardName}::${bucket}`);
  const pre = TITLE_PREFIXES[Math.floor(pseudoRandom(seed, variantIndex + 40) * TITLE_PREFIXES.length)]!;
  const suf = TITLE_SUFFIXES[Math.floor(pseudoRandom(seed, variantIndex + 50) * TITLE_SUFFIXES.length)]!;
  return `${pre}${cardName} ${condPhrase}${suf}`;
}

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

function computeStats(prices: number[]): Pick<MockComps, "avgPrice" | "medianPrice" | "lowPrice" | "highPrice"> {
  const sorted = [...prices].sort((a, b) => a - b);
  const low = sorted[0]!;
  const high = sorted[sorted.length - 1]!;
  const sum = prices.reduce((a, b) => a + b, 0);
  const avg = sum / prices.length;
  const mid = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!;
  return {
    avgPrice: roundMoney(avg),
    medianPrice: roundMoney(median),
    lowPrice: roundMoney(low),
    highPrice: roundMoney(high),
  };
}

const PLACEHOLDER_EBAY = "https://www.ebay.com";

/**
 * Deterministic mock sold comps shaped like a future real provider payload.
 * Same card + condition yields a stable baseline; per-listing noise is seeded (±10–15%).
 */
export function generateMockComps(cardName: string, condition: string): MockComps {
  const bucket = normalizeConditionBucket(condition);
  const seed = hashSeed(`${cardName.trim().toLowerCase()}::${bucket}`);
  const base = getBasePrice(cardName) * getConditionMultiplier(bucket);

  const dayOffsets = [0, 1, 2, 3, 4];
  for (let i = dayOffsets.length - 1; i > 0; i--) {
    const j = Math.floor(pseudoRandom(seed, 200 + i) * (i + 1));
    const tmp = dayOffsets[i]!;
    dayOffsets[i] = dayOffsets[j]!;
    dayOffsets[j] = tmp;
  }

  const prices: number[] = [];
  const rawListings: Omit<MockListing, "position">[] = [];

  for (let i = 0; i < 5; i++) {
    const jitter = 0.85 + pseudoRandom(seed, i) * 0.3;
    const soldPrice = roundMoney(base * jitter);
    prices.push(soldPrice);
    rawListings.push({
      title: generateTitle(cardName, bucket, i),
      soldPrice,
      soldDate: generateDate(dayOffsets[i]!),
      listingUrl: PLACEHOLDER_EBAY,
      conditionLabel: conditionDisplayLabel(bucket),
    });
  }

  const stats = computeStats(prices);
  const sorted = [...rawListings].sort(
    (a, b) => new Date(b.soldDate).getTime() - new Date(a.soldDate).getTime(),
  );
  const listings: MockListing[] = sorted.map((row, idx) => ({
    ...row,
    position: idx + 1,
  }));

  return {
    ...stats,
    listingsCount: 5,
    listings,
  };
}
