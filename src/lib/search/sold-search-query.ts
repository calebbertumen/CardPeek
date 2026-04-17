import type { ConditionBucket } from "@prisma/client";
import { CONDITION_OPTIONS } from "@/lib/normalize";

/**
 * Builds a single eBay keyword string for sold-listing search (Apify actor input).
 * Uses card catalog fields + condition context so queries are specific and stable.
 */
export function buildEbaySoldSearchKeyword(input: {
  name: string;
  setName?: string | null;
  cardNumber?: string | null;
  conditionBucket: ConditionBucket;
}): string {
  const name = input.name.trim().replace(/\s+/g, " ");
  const parts: string[] = [];
  if (name) parts.push(name);
  const set = input.setName?.trim().replace(/\s+/g, " ");
  if (set) parts.push(set);
  const num = input.cardNumber?.trim();
  if (num) parts.push(`#${num}`);

  const label = CONDITION_OPTIONS.find((c) => c.value === input.conditionBucket)?.label;
  if (label && input.conditionBucket.startsWith("psa")) {
    parts.push(label);
  }

  let keyword = parts.join(" ").replace(/\s+/g, " ").trim();

  // eBay supports minus-keywords; narrows sold search away from slabs for raw buckets.
  if (input.conditionBucket.startsWith("raw_")) {
    keyword = `${keyword} -PSA -BGS -CGC -SGC -TAG -graded`.replace(/\s+/g, " ").trim();
  }

  return keyword;
}

/**
 * Keyword for eBay sold-search links and API display. Raw buckets always use {@link buildEbaySoldSearchKeyword} so
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
    return buildEbaySoldSearchKeyword(input);
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
 * Used alongside `buildCacheKey` from card identity — this is the string form of the search.
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
