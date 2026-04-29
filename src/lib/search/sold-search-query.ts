import type { ConditionBucket } from "@prisma/client";
import { CONDITION_OPTIONS } from "@/lib/normalize";

/**
 * Broad raw-lane keyword: catalog identity only (no condition tokens). Still excludes obvious slab keywords for raw.
 */
export function buildBroadRawEbaySoldSearchKeyword(input: {
  name: string;
  setName?: string | null;
  cardNumber?: string | null;
}): string {
  const name = input.name.trim().replace(/\s+/g, " ");
  const parts: string[] = [];
  if (name) parts.push(name);
  const set = input.setName?.trim().replace(/\s+/g, " ");
  if (set) parts.push(set);
  const num = input.cardNumber?.trim();
  if (num) parts.push(`#${num}`);
  let keyword = parts.join(" ").replace(/\s+/g, " ").trim();
  keyword = `${keyword} -PSA -BGS -CGC -SGC -TAG -graded`.replace(/\s+/g, " ").trim();
  return keyword;
}

/**
 * Narrow sold search when the broad pass yields too few bucket-matching comps (Collector fallback only).
 * Title terms are hints only; listings are still classified downstream.
 */
export function buildConditionFallbackEbaySoldSearchKeyword(input: {
  name: string;
  setName?: string | null;
  cardNumber?: string | null;
  conditionBucket: ConditionBucket;
}): string | null {
  if (!input.conditionBucket.startsWith("raw_")) return null;
  if (input.conditionBucket === "raw_mp_hp") return null;

  const base = buildBroadRawEbaySoldSearchKeyword({
    name: input.name,
    setName: input.setName,
    cardNumber: input.cardNumber,
  });

  const tailByBucket: Record<"raw_nm" | "raw_lp", string> = {
    raw_nm: `"near mint" NM`,
    raw_lp: `"lightly played" LP`,
  };

  const tail = tailByBucket[input.conditionBucket as keyof typeof tailByBucket];
  if (!tail) return null;

  return `${base} ${tail}`.replace(/\s+/g, " ").trim();
}

/**
 * Sequential narrow queries for the combined MP/HP/DMG bucket (one Apify run each, only until enough comps).
 */
export function buildRawMpHpFallbackEbaySearchKeywords(input: {
  name: string;
  setName?: string | null;
  cardNumber?: string | null;
}): string[] {
  const base = buildBroadRawEbaySoldSearchKeyword({
    name: input.name,
    setName: input.setName,
    cardNumber: input.cardNumber,
  });
  return [
    `${base} "moderately played" MP`.replace(/\s+/g, " ").trim(),
    `${base} "heavily played" HP`.replace(/\s+/g, " ").trim(),
    `${base} damaged DMG`.replace(/\s+/g, " ").trim(),
  ];
}

export function buildEbaySoldSearchKeyword(input: {
  name: string;
  setName?: string | null;
  cardNumber?: string | null;
  conditionBucket: ConditionBucket;
}): string {
  if (input.conditionBucket.startsWith("raw_")) {
    return buildBroadRawEbaySoldSearchKeyword({
      name: input.name,
      setName: input.setName,
      cardNumber: input.cardNumber,
    });
  }

  const name = input.name.trim().replace(/\s+/g, " ");
  const parts: string[] = [];
  if (name) parts.push(name);
  const set = input.setName?.trim().replace(/\s+/g, " ");
  if (set) parts.push(set);
  const num = input.cardNumber?.trim();
  if (num) parts.push(`#${num}`);

  const label = CONDITION_OPTIONS.find((c) => c.value === input.conditionBucket)?.label;
  if (label) parts.push(label);

  return parts.join(" ").replace(/\s+/g, " ").trim();
}

/**
 * Keyword for eBay sold-search links and API display. Raw buckets always use {@link buildBroadRawEbaySoldSearchKeyword} so
 * minus-keyword exclusions (e.g. `-TAG`) stay current even when `CardCache.ebaySearchKeyword` was stored by an older scrape.
 */
export function resolveEbaySoldSearchKeywordForDisplay(input: {
  storedKeyword: string | null | undefined;
  name: string;
  setName?: string | null;
  cardNumber?: string | null;
  conditionBucket: ConditionBucket;
}): string {
  if (input.conditionBucket.startsWith("raw_")) {
    return buildBroadRawEbaySoldSearchKeyword({
      name: input.name,
      setName: input.setName,
      cardNumber: input.cardNumber,
    });
  }
  const s = input.storedKeyword?.trim();
  return s || buildEbaySoldSearchKeyword(input);
}

/**
 * eBay sold & completed listings search (matches the kind of query used for CardPeek’s Apify scrape).
 */
export function buildEbaySoldListingsSearchUrl(keyword: string, siteHost: string = "www.ebay.com"): string {
  const q = keyword.trim();
  if (!q) return `https://${siteHost}/sch/i.html`;
  const encoded = encodeURIComponent(q);
  return `https://${siteHost}/sch/i.html?_nkw=${encoded}&LH_Sold=1&LH_Complete=1`;
}

/**
 * Normalizes a keyword for equality checks (same card + minor punctuation/space variants).
 * Used alongside `buildCacheKey` from card identity  -  this is the string form of the search.
 */
export function normalizeSoldSearchKeywordForDedupe(keyword: string): string {
  return keyword
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[’']/g, "'")
    .replace(/[^a-z0-9\s#./\-]/gi, "")
    .trim();
}
