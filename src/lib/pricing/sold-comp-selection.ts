import type { ConditionBucket } from "@prisma/client";
import {
  isLikelyGradedListingTitle,
  soldListingTitleMatchesBucket,
  titleLooksLikeMysteryOrGrabBagListing,
} from "@/lib/search/ebay-sold-filters";
import type { ScrapedCardSnapshot, ScrapedSoldListing, SoldCompCardContext } from "@/lib/scraping/types";
import { SOLD_COMP_SCORING } from "@/lib/pricing/sold-comp-scoring-config";

export type ScoredSoldComp = {
  listing: ScrapedSoldListing;
  compScore: number;
  identityScore: number;
  conditionScore: number;
  qualityScore: number;
  priceSanityScore: number;
  recencyScore: number;
  sellerScore: number;
  isPriceOutlier: boolean;
  fatalExclude: boolean;
};

function slug(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^a-z0-9\s#/\-]/gi, "");
}

function combinedText(listing: ScrapedSoldListing): string {
  return `${listing.title ?? ""} ${listing.conditionLabel ?? ""}`.trim();
}

function titleHasName(title: string, name: string): boolean {
  const t = slug(title);
  const n = slug(name);
  if (!n || n.length < 2) return false;
  if (t.includes(n)) return true;
  const parts = n.split(" ").filter((p) => p.length > 1);
  if (parts.length === 0) return false;
  const hits = parts.filter((p) => t.includes(p));
  return hits.length >= Math.min(2, parts.length);
}

function extractTitleNumbers(title: string): string[] {
  const out: string[] = [];
  const re = /#?\s*(\d{1,4})\b/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(title)) !== null) {
    out.push(m[1]!);
  }
  return out;
}

function titleHasCardNumber(title: string, cardNumber: string | null): boolean {
  if (!cardNumber?.trim()) return false;
  const want = cardNumber.trim().replace(/^#/, "");
  if (!/^\d+$/.test(want)) return false;
  const nums = extractTitleNumbers(title);
  return nums.includes(want);
}

function titleConflictingNumber(title: string, cardNumber: string | null): boolean {
  if (!cardNumber?.trim()) return false;
  const want = cardNumber.trim().replace(/^#/, "");
  if (!/^\d+$/.test(want)) return false;
  const nums = extractTitleNumbers(title);
  if (nums.length === 0) return false;
  return nums.some((n) => n !== want);
}

function titleHasSet(title: string, setName: string | null): boolean {
  if (!setName?.trim()) return false;
  const s = slug(setName);
  if (s.length < 3) return false;
  return slug(title).includes(s);
}

const VARIANT_RE =
  /\b(holo|reverse\s*holo|reverse|full\s*art|illustration\s*rare|ir\b|ex\b|gx\b|vmax|vstar|\bv\b|tg\b|promo|prerelease|staff|error|1st\s*edition|shadowless)\b/i;

function variantBonus(title: string): number {
  return VARIANT_RE.test(title) ? SOLD_COMP_SCORING.identity.variantKeyword : 0;
}

function strongLotBundle(title: string): boolean {
  const t = title.toLowerCase();
  if (/\b(lot|bundle|collection|bulk|playset|binder)\b/i.test(t)) return true;
  if (/\bx\s*[2-9]\b/i.test(t)) return true;
  if (/\bset\s+of\b/i.test(t)) return true;
  return titleLooksLikeMysteryOrGrabBagListing(title);
}

function strongSealed(title: string): boolean {
  return /\b(sealed|booster\s*pack|etb|elite\s*trainer|booster\s*box|display\s*box|case\s*of)\b/i.test(title);
}

function strongProxy(title: string): boolean {
  return /\b(proxy|replica|fake|counterfeit|custom\s*card|metal\s*card|gold\s*card)\b/i.test(title);
}

function titleLooksLikeAccessory(title: string): boolean {
  const t = title.toLowerCase();
  return (
    /\bcustom\s+case\b/i.test(t) ||
    /\bdisplay\s+case\b/i.test(t) ||
    /\bcard\s+case\b/i.test(t) ||
    /\bprotector\b/i.test(t) ||
    /\btop\s*loader\b/i.test(t) ||
    /\bsleeve(?:s)?\b/i.test(t) ||
    /\bdeck\s*box\b/i.test(t)
  );
}

function scoreIdentity(title: string, ctx: SoldCompCardContext): { score: number; fatalNumber: boolean } {
  let s = 0;
  if (titleHasName(title, ctx.name)) s += SOLD_COMP_SCORING.identity.namePresent;
  if (titleHasCardNumber(title, ctx.cardNumber)) s += SOLD_COMP_SCORING.identity.numberPresent;
  else if (titleConflictingNumber(title, ctx.cardNumber)) {
    return { score: SOLD_COMP_SCORING.identity.wrongNumber, fatalNumber: true };
  }
  if (titleHasSet(title, ctx.setName)) s += SOLD_COMP_SCORING.identity.setPresent;
  s += variantBonus(title);
  if (strongLotBundle(title)) s += SOLD_COMP_SCORING.identity.lotBundleHint;
  s = Math.max(0, Math.min(SOLD_COMP_SCORING.maxIdentity, s));
  return { score: s, fatalNumber: false };
}

function fatalExcludeListing(listing: ScrapedSoldListing, ctx: SoldCompCardContext): boolean {
  const title = listing.title;
  const combined = combinedText(listing);
  if (strongSealed(title) || strongProxy(title) || titleLooksLikeAccessory(title)) return true;
  if (ctx.conditionBucket.startsWith("raw_")) {
    if (isLikelyGradedListingTitle(combined)) return true;
  }
  if (strongLotBundle(title)) return true;
  if (!soldListingTitleMatchesBucket(title, ctx.conditionBucket, listing.conditionLabel ?? null)) return true;
  return false;
}

function rawConditionSignals(t: string): { nm: boolean; lp: boolean; mp: boolean; hp: boolean; dmg: boolean } {
  const combined = t;
  const nm =
    /\bnear\s*mint\b/i.test(combined) ||
    /\bnm\b/i.test(combined) ||
    /\bmint\b/i.test(combined) ||
    /\bminty\b/i.test(combined);
  const lp =
    /\blightly\s*played\b/i.test(combined) ||
    /\blp\b/i.test(combined) ||
    /\blight\s*play(?:ed)?\b/i.test(combined);
  const mp =
    /\bmoderately\s*played\b/i.test(combined) ||
    /\bmp\b/i.test(combined) ||
    /\bmod(?:erate(?:ly)?)?\s*play(?:ed)?\b/i.test(combined);
  const hp =
    /\bheavily\s*played\b/i.test(combined) ||
    /\bhp\b/i.test(combined) ||
    /\bheavy\s*play(?:ed)?\b/i.test(combined);
  const dmg =
    /\bdamaged\b/i.test(combined) ||
    /\bdmg\b/i.test(combined) ||
    /\bpoor\b/i.test(combined) ||
    /\bcreases?\b/i.test(combined) ||
    /\bwater\s*damage\b/i.test(combined) ||
    /\btear(?:s|ed)?\b/i.test(combined) ||
    /\b(whitening|white\s*edges?|edgewear|edge\s*wear)\b/i.test(combined);
  return { nm, lp, mp, hp, dmg };
}

function scoreConditionForBucket(combined: string, bucket: ConditionBucket, thinSample: boolean): number {
  const s = rawConditionSignals(combined);
  if (bucket === "raw_nm") {
    if (s.mp || s.hp || s.dmg) return 0;
    if (s.nm) return 25;
    if (s.lp) return thinSample ? 12 : 0;
    if (!s.nm && !s.lp && !s.mp && !s.hp && !s.dmg) return 18;
    return 0;
  }
  if (bucket === "raw_lp") {
    if (s.dmg || s.hp) return 0;
    if (s.mp) return thinSample ? 10 : 4;
    if (s.lp) return 25;
    if (s.nm) return thinSample ? 14 : 8;
    if (!s.nm && !s.lp && !s.mp && !s.hp && !s.dmg) return thinSample ? 14 : 10;
    return 0;
  }
  if (bucket === "raw_mp_hp") {
    if (s.nm && !thinSample) return 0;
    if (s.mp) return 25;
    if (s.hp) return 25;
    if (s.dmg) return 25;
    if (s.lp) return thinSample ? 16 : 8;
    if (s.nm && thinSample) return 6;
    if (!s.nm && !s.lp && !s.mp && !s.hp && !s.dmg) return thinSample ? 10 : 0;
    return 0;
  }
  return 0;
}

function scoreCondition(listing: ScrapedSoldListing, bucket: ConditionBucket, thinSample: boolean): number {
  const combined = combinedText(listing);
  if (!bucket.startsWith("raw_")) {
    return soldListingTitleMatchesBucket(listing.title, bucket, listing.conditionLabel ?? null) ? 25 : 0;
  }
  return Math.min(SOLD_COMP_SCORING.maxCondition, scoreConditionForBucket(combined, bucket, thinSample));
}

function scoreQuality(listing: ScrapedSoldListing, title: string): number {
  let q = 0;
  q += 5;
  if (title.length >= 18 && title.length < 140) q += 4;
  if (Number.isFinite(listing.soldPrice) && listing.soldPrice > 0 && listing.soldAt.getTime() > 0) q += 3;
  if (listing.imageUrl || listing.itemId) q += 3;
  const t = title.toLowerCase();
  if (/\b(read\s*description|rd\b)\b/i.test(t) && /\b(wear|damage|played|hp|mp)\b/i.test(t)) q -= 5;
  return Math.max(0, Math.min(SOLD_COMP_SCORING.maxQuality, q));
}

function scoreRecency(soldAt: Date): number {
  const t = soldAt.getTime();
  if (!Number.isFinite(t) || t <= 0) return SOLD_COMP_SCORING.recency.neutralWhenNoDate;
  const days = (Date.now() - t) / 86_400_000;
  if (!Number.isFinite(days) || days < 0) return SOLD_COMP_SCORING.recency.neutralWhenNoDate;
  if (days <= 7) return 10;
  if (days <= 14) return 8;
  if (days <= 30) return 6;
  if (days <= 60) return 4;
  if (days <= 90) return 2;
  return 0;
}

function scorePriceSanity(price: number, median: number): number {
  if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(median) || median <= 0) return 0;
  const r = Math.abs(price - median) / median;
  for (const b of SOLD_COMP_SCORING.priceSanity.bands) {
    if (r <= b.maxRatio) return b.points;
  }
  return 0;
}

function computePriceOutlier(price: number, median: number): boolean {
  if (!Number.isFinite(price) || !Number.isFinite(median) || median <= 0) return false;
  return price > median * SOLD_COMP_SCORING.priceSanity.outlierHigh || price < median * SOLD_COMP_SCORING.priceSanity.outlierLow;
}

function scoreSellerConfidence(listing: ScrapedSoldListing, title: string): number {
  void title;
  if (listing.itemUrl && /^https:\/\/www\.ebay\.com\/itm\/\d+/i.test(listing.itemUrl)) {
    return Math.min(SOLD_COMP_SCORING.maxSellerConfidence, SOLD_COMP_SCORING.sellerConfidence.neutralWhenNoData + 1);
  }
  return SOLD_COMP_SCORING.sellerConfidence.neutralWhenNoData;
}

function median(nums: number[]): number {
  const s = [...nums].filter((n) => Number.isFinite(n) && n > 0).sort((a, b) => a - b);
  if (s.length === 0) return 0;
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[mid - 1]! + s[mid]!) / 2 : s[mid]!;
}

function trimmedMeanFive(prices: number[]): number | null {
  if (prices.length !== 5) return null;
  const s = [...prices].sort((a, b) => a - b);
  const inner = s.slice(1, 4);
  return inner.reduce((a, b) => a + b, 0) / inner.length;
}

function logScoresDebug(scored: ScoredSoldComp[], ctx: SoldCompCardContext): void {
  if (process.env.NODE_ENV !== "development" || process.env.SOLD_COMP_SCORE_DEBUG !== "1") return;
  // eslint-disable-next-line no-console -- intentional tuning aid
  console.debug(
    "[sold-comp-selection]",
    ctx.name,
    ctx.conditionBucket,
    scored.map((r) => ({
      title: r.listing.title.slice(0, 60),
      total: r.compScore,
      id: r.identityScore,
      cond: r.conditionScore,
      out: r.isPriceOutlier,
    })),
  );
}

/**
 * Scores cleaned listings, drops outliers when possible, prefers comps score ≥60 (≥45 when thin),
 * returns up to {@link SOLD_COMP_SCORING.selection.maxComps} comps sorted by quality (not raw recency).
 */
export function scoreAndSelectSoldComps(
  listings: ScrapedSoldListing[],
  ctx: SoldCompCardContext,
): {
  selected: ScrapedSoldListing[];
  scored: ScoredSoldComp[];
  excludedPrices: number[];
  usedWeakComps: boolean;
  trimmedMean: number | null;
} {
  const cfg = SOLD_COMP_SCORING.selection;
  const prelim: ScrapedSoldListing[] = [];
  for (const l of listings) {
    if (!Number.isFinite(l.soldPrice) || l.soldPrice <= 0) continue;
    if (fatalExcludeListing(l, ctx)) continue;
    prelim.push(l);
  }

  const excludedPrices: number[] = [];
  const poolLt = SOLD_COMP_SCORING.identity.excludeBelowUnlessPoolLt;
  if (prelim.length === 0) {
    return { selected: [], scored: [], excludedPrices, usedWeakComps: false, trimmedMean: null };
  }

  const med = median(prelim.map((l) => l.soldPrice));
  const thinSample = prelim.length < 5;

  const scoredDraft: ScoredSoldComp[] = [];
  for (const listing of prelim) {
    const title = listing.title;
    const id = scoreIdentity(title, ctx);
    if (id.fatalNumber) {
      excludedPrices.push(listing.soldPrice);
      continue;
    }
    const identityScore = id.score;
    if (identityScore < SOLD_COMP_SCORING.identity.excludeIdentityThreshold && prelim.length >= poolLt) {
      excludedPrices.push(listing.soldPrice);
      continue;
    }
    const conditionScore = scoreCondition(listing, ctx.conditionBucket, thinSample);
    const qualityScore = scoreQuality(listing, title);
    const priceSanityScore = scorePriceSanity(listing.soldPrice, med);
    const recencyScore = scoreRecency(listing.soldAt);
    const sellerScore = scoreSellerConfidence(listing, title);
    const isPriceOutlier = computePriceOutlier(listing.soldPrice, med);

    let compScore = Math.min(
      SOLD_COMP_SCORING.maxTotal,
      identityScore + conditionScore + qualityScore + priceSanityScore + recencyScore + sellerScore,
    );
    compScore = Math.max(0, compScore);

    scoredDraft.push({
      listing,
      compScore,
      identityScore,
      conditionScore,
      qualityScore,
      priceSanityScore,
      recencyScore,
      sellerScore,
      isPriceOutlier,
      fatalExclude: false,
    });
  }

  if (scoredDraft.length === 0) {
    return { selected: [], scored: [], excludedPrices, usedWeakComps: false, trimmedMean: null };
  }

  let working = [...scoredDraft];
  const nonOut = working.filter((w) => !w.isPriceOutlier);
  if (nonOut.length >= SOLD_COMP_SCORING.priceSanity.minCompsBeforeOutlierDrop) {
    working = nonOut;
  }

  working.sort((a, b) => b.compScore - a.compScore);
  const usable = working.filter((w) => w.compScore >= cfg.usableMinScore);
  const weak = working.filter((w) => w.compScore >= cfg.weakMinScore && w.compScore < cfg.usableMinScore);

  let chosen: ScoredSoldComp[] = [];
  let usedWeakComps = false;

  if (usable.length >= cfg.minUsablePreferred) {
    chosen = usable.slice(0, cfg.maxComps);
  } else if (usable.length > 0) {
    chosen = [...usable, ...weak].slice(0, cfg.maxComps);
    usedWeakComps = weak.some((w) => chosen.includes(w));
  } else {
    chosen = [...usable, ...weak, ...working.filter((w) => w.compScore < cfg.weakMinScore)].slice(0, cfg.maxComps);
    usedWeakComps = true;
  }

  chosen.sort((a, b) => {
    if (b.compScore !== a.compScore) return b.compScore - a.compScore;
    if (b.conditionScore !== a.conditionScore) return b.conditionScore - a.conditionScore;
    if (b.identityScore !== a.identityScore) return b.identityScore - a.identityScore;
    return b.listing.soldAt.getTime() - a.listing.soldAt.getTime();
  });
  chosen = chosen.slice(0, cfg.maxComps);

  const selectedPrices = chosen.map((c) => c.listing.soldPrice);
  for (const s of scoredDraft) {
    if (!chosen.find((c) => c.listing === s.listing)) {
      excludedPrices.push(s.listing.soldPrice);
    }
  }

  logScoresDebug(chosen, ctx);

  const trimmedMean = trimmedMeanFive(selectedPrices);

  return {
    selected: chosen.map((c) => c.listing),
    scored: chosen,
    excludedPrices,
    usedWeakComps,
    trimmedMean,
  };
}

/**
 * Builds the persisted Apify snapshot: primary headline = **median** of selected comps; low/high = selected range.
 */
export function buildScrapedCardSnapshotFromSoldListings(input: {
  normalizedCardIdentifier: string;
  displayName: string;
  listings: ScrapedSoldListing[];
  context: SoldCompCardContext;
}): ScrapedCardSnapshot {
  const { selected, excludedPrices, trimmedMean } = scoreAndSelectSoldComps(input.listings, input.context);
  void excludedPrices;

  if (selected.length === 0) {
    return {
      normalizedCardIdentifier: input.normalizedCardIdentifier,
      displayName: input.displayName,
      soldListings: [],
      averagePrice: 0,
      medianPrice: 0,
      minPrice: 0,
      maxPrice: 0,
      scrapedAt: new Date(),
    };
  }

  const prices = selected.map((l) => l.soldPrice);
  const med = median(prices);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);

  return {
    normalizedCardIdentifier: input.normalizedCardIdentifier,
    displayName: input.displayName,
    soldListings: selected,
    averagePrice: Math.round(med * 100) / 100,
    medianPrice: Math.round(med * 100) / 100,
    minPrice: Math.round(minPrice * 100) / 100,
    maxPrice: Math.round(maxPrice * 100) / 100,
    scrapedAt: new Date(),
    trimmedMeanPrice: trimmedMean != null ? Math.round(trimmedMean * 100) / 100 : undefined,
  };
}

export type { SoldCompCardContext } from "@/lib/scraping/types";
