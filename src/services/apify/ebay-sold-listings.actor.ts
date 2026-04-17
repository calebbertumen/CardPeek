import type { ConditionBucket } from "@prisma/client";
import { soldListingTitleMatchesBucket } from "@/lib/search/ebay-sold-filters";
import type { ScrapedCardSnapshot, ScrapedSoldListing, SoldListingCandidate } from "@/lib/scraping/types";
import {
  canonicalEbayItemUrl,
  isEbaySearchOrBrowseUrl,
  listingItemIdFromActorFields,
  normalizeEbayItemId,
} from "@/lib/search/ebay-sold-filters";
import { logSoldScrapeMetric } from "@/services/apify/scrape-metrics";
import { computeDisplayedAveragePrice } from "@/lib/pricing/compute-displayed-average-price";
import {
  ebaySoldSearchHtmlIndicatesNoExactMatches,
  fetchEbaySoldSearchPageHtml,
} from "@/lib/search/ebay-sold-search-exact-match";

type ApifyRun = { id: string; defaultDatasetId: string; status?: string };

/** Apify returns the run when waitForFinish elapses even if the actor is still RUNNING — dataset can be empty until SUCCEEDED. */
const TERMINAL_RUN_STATUSES = new Set(["SUCCEEDED", "FAILED", "ABORTED", "TIMED-OUT"]);

function isTerminalRunStatus(status: string | undefined): boolean {
  return status != null && TERMINAL_RUN_STATUSES.has(status);
}

type ApifyItem = Record<string, unknown>;

function getEnvToken(): string {
  const token = process.env.APIFY_TOKEN;
  if (!token) throw new Error("Missing APIFY_TOKEN");
  return token;
}

/** Default: caffein.dev~ebay-sold-listings (Apify: owner `caffein.dev` + `~` + actor name). */
export function getEbaySoldListingsActorId(): string {
  return process.env.APIFY_EBAY_SOLD_ACTOR_ID?.trim() || "caffein.dev~ebay-sold-listings";
}

function waitForFinishSeconds(): number {
  const n = Number(process.env.APIFY_WAIT_FOR_FINISH_SEC ?? "120");
  return Math.min(Math.max(Number.isFinite(n) ? n : 120, 30), 600);
}

function daysToScrape(): number {
  const n = Number(process.env.APIFY_EBAY_SOLD_DAYS_TO_SCRAPE ?? "14");
  return Math.min(Math.max(Number.isFinite(n) ? n : 14, 1), 90);
}

/**
 * Single Apify actor request size: candidate sold rows (cost cap). Do not raise without an explicit product change.
 */
export const CANDIDATE_FETCH_COUNT = 8;

/** Max listings returned after validation (subset of candidates; no backfill below this cap). */
export const MAX_VALID_SOLD_LISTINGS = 5;

function maxValidSoldListings(): number {
  return MAX_VALID_SOLD_LISTINGS;
}

function storeRawPayload(): boolean {
  return process.env.SCRAPING_STORE_RAW_PAYLOAD === "true";
}

/**
 * Best-offer-accepted sales from raw eBay HTML (SSR). The visible "Best offer accepted" label,
 * embedded NAPI/JSON flags, and struck-through BIN on sold pages are all strong signals.
 */
export function ebayHtmlImpliesBestOfferAccepted(html: string): boolean {
  if (!html) return false;
  const lower = html.toLowerCase();
  const normalized = lower.replace(/\u00a0/g, " ").replace(/\s+/g, " ");

  if (normalized.includes("best offer accepted")) return true;
  if (normalized.includes("best offer was accepted")) return true;
  if (normalized.includes("ended with best offer")) return true;

  if (lower.includes("itemendedwithbestoffer")) return true;

  if (/"bestofferaccepted"\s*:\s*true/.test(lower)) return true;
  if (/'bestofferaccepted'\s*:\s*true/.test(lower)) return true;
  if (/"itemendedwithbestoffer"\s*:\s*true/.test(lower)) return true;

  const bestOfferProximityAccepted =
    /\bbest\s*offer\b[\s\S]{0,160}\baccept/i.test(html) || /\baccept\b[\s\S]{0,160}\bbest\s*offer\b/i.test(html);
  if (bestOfferProximityAccepted) return true;

  const hasStrikeMarkup =
    /<\s*(s|del|strike)\b/i.test(html) ||
    /text-decoration\s*:\s*line-through/i.test(lower) ||
    /text-decoration-line\s*:\s*line-through/i.test(lower) ||
    /ux-textspans--strikethrough/i.test(lower) ||
    /\bstrikethrough\b/i.test(lower);

  const looksSold = ebayHtmlLooksLikeSoldEndedPage(html);
  if (looksSold && hasStrikeMarkup) return true;

  // Sold pages: struck-through list/BIN price (final sale was lower) — common BO layout.
  if (looksSold) {
    if (/<\s*s\b[^>]*>[\s\S]{0,120}?[$€£¥][\d,.]+/i.test(html)) return true;
    if (/<\s*del\b[^>]*>[\s\S]{0,120}?[$€£¥][\d,.]+/i.test(html)) return true;
    if (/<\s*span[^>]*line-through[\s\S]{0,200}?[$€£¥][\d,.]+/i.test(lower)) return true;
  }

  return false;
}

/**
 * Sold / ended listing signals in SSR HTML. Used by `ebayHtmlImpliesBestOfferAccepted` (strikethrough / BO layout),
 * not to reject rows — the Apify actor already targets sold listings.
 */
export function ebayHtmlLooksLikeSoldEndedPage(html: string): boolean {
  if (!html) return false;
  if (/this\s+listing\s+sold\s+on/i.test(html)) return true;
  if (/this\s+item\s+sold/i.test(html)) return true;
  if (/this\s+listing\s+ended/i.test(html)) return true;
  if (/listing\s+has\s+ended/i.test(html)) return true;
  if (/this\s+auction\s+ended/i.test(html)) return true;
  if (/winning\s+bid/i.test(html) && /sold|ended/i.test(html)) return true;
  if (/"itemEnded"\s*:\s*true/i.test(html)) return true;
  if (/itemEndedWithBestOffer/i.test(html)) return true;
  return false;
}

const APIFY_RETRYABLE_STATUSES = new Set([429, 502, 503, 504]);

/**
 * Calls Apify REST with retries on transient gateway/rate-limit errors (common: 502 during waitForFinish).
 */
async function apifyFetch(path: string, init?: RequestInit): Promise<Response> {
  const token = getEnvToken();
  const baseUrl = `https://api.apify.com/v2${path}${path.includes("?") ? "&" : "?"}token=${encodeURIComponent(token)}`;
  const maxAttempts = 4;
  let lastErr: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const res = await fetch(baseUrl, init);
      if (res.ok) return res;

      const status = res.status;
      const text = await res.text().catch(() => "");
      const snippet = text ? `: ${text.slice(0, 200)}` : "";

      if (APIFY_RETRYABLE_STATUSES.has(status) && attempt < maxAttempts) {
        const delayMs = Math.min(500 * 2 ** (attempt - 1), 8000);
        await new Promise((r) => setTimeout(r, delayMs));
        lastErr = new Error(`Apify API ${status}${snippet}`);
        continue;
      }

      throw new Error(`Apify API ${status}${snippet}`);
    } catch (e) {
      const isNetwork =
        e instanceof TypeError ||
        (e instanceof Error && /fetch|network|abort|ECONNRESET/i.test(e.message));
      if (isNetwork && attempt < maxAttempts) {
        const delayMs = Math.min(500 * 2 ** (attempt - 1), 8000);
        await new Promise((r) => setTimeout(r, delayMs));
        lastErr = e instanceof Error ? e : new Error(String(e));
        continue;
      }
      throw e;
    }
  }

  throw lastErr ?? new Error("Apify API request failed after retries");
}

async function getActorRun(runId: string): Promise<ApifyRun> {
  const res = await apifyFetch(`/actor-runs/${encodeURIComponent(runId)}`);
  const json = (await res.json()) as { data: ApifyRun };
  return json.data;
}

/**
 * After POST /runs?waitForFinish=…, the HTTP response may return while status is still RUNNING.
 * Poll until the run is terminal so the default dataset contains the final items.
 */
async function waitForRunSucceededOrThrow(run: ApifyRun, absoluteDeadlineMs: number): Promise<ApifyRun> {
  let current: ApifyRun = run.status ? run : await getActorRun(run.id);
  const deadline = Math.min(absoluteDeadlineMs, Date.now() + 10 * 60 * 1000);

  while (!isTerminalRunStatus(current.status) && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 1500));
    current = await getActorRun(run.id);
  }

  if (!isTerminalRunStatus(current.status)) {
    throw new Error(`APIFY_RUN_TIMEOUT:${current.status ?? "UNKNOWN"}`);
  }
  if (current.status !== "SUCCEEDED") {
    throw new Error(`APIFY_RUN_NOT_SUCCEEDED:${current.status}`);
  }
  return current;
}

function getStr(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function firstPictureFromActor(pictures: unknown): string | null {
  if (!Array.isArray(pictures) || pictures.length === 0) return null;
  const p0 = pictures[0];
  if (typeof p0 === "string") return getStr(p0);
  if (p0 && typeof p0 === "object") {
    const o = p0 as Record<string, unknown>;
    return getStr(o.url) ?? getStr(o.imageUrl) ?? getStr(o.image);
  }
  return null;
}

/** eBay / Apify often return prices as strings ("215", "$215.00", "1,234.56"). */
export function parseMoneyField(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  // Some actors return structured money objects like:
  // { amount: 123.45, currency: "USD" } or { value: "123.45", ... }
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    const candidates = [
      o.amount,
      o.value,
      o.val,
      o.price,
      o.money,
      o.amountValue,
      o.numericValue,
    ];
    for (const c of candidates) {
      const n = parseMoneyField(c);
      if (Number.isFinite(n)) return n;
    }
  }
  if (v == null) return NaN;
  const s = String(v).trim();
  if (!s) return NaN;
  const normalized = s.replace(/[$€£¥]/g, "").replace(/,/g, "");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : NaN;
}

function normalizeDatasetItemsJson(raw: unknown): ApifyItem[] {
  // Apify dataset items endpoint usually returns a bare array when `format=json`,
  // but some actors / API variants can wrap results.
  if (Array.isArray(raw)) return raw as ApifyItem[];
  if (raw && typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    const data = o.data;
    if (Array.isArray(data)) return data as ApifyItem[];
    const items = o.items;
    if (Array.isArray(items)) return items as ApifyItem[];
  }
  return [];
}

function parseSoldAt(it: ApifyItem): Date | null {
  const raw =
    it.endedAt ??
    it.soldAt ??
    it.soldDate ??
    it.endTime ??
    it.ended ??
    it.dateEnded ??
    it.scrapedAt ??
    it.updatedAt;
  if (raw == null) return null;
  const d = new Date(String(raw));
  return d instanceof Date && !Number.isNaN(d.getTime()) ? d : null;
}

function titleLooksLikeAccessoryOrPackaging(title: string): boolean {
  const t = (title ?? "").toLowerCase();
  if (!t.trim()) return false;

  // Lightweight exclusions for common non-card sold results (cases, sleeves, binders, etc.).
  // This is intentionally keyword-based to keep cost/complexity low.
  const patterns: RegExp[] = [
    /\bcustom\s+case\b/i,
    /\bdisplay\s+case\b/i,
    /\bcard\s+case\b/i,
    /\bcase\b/i,
    /\bprotector\b/i,
    /\btop\s*loader\b/i,
    /\btoploader\b/i,
    /\bsleeve(?:s)?\b/i,
    /\bbinder\b/i,
    /\bdeck\s*box\b/i,
    /\bstorage\s+box\b/i,
    /\blot\s+of\b/i,
  ];

  return patterns.some((p) => p.test(t));
}

/**
 * Minimal row gate: positive sold price only. Listing identity, bucket, BO, and HTML checks are not applied.
 */
export function isValidSoldListing(listing: SoldListingCandidate): boolean {
  if (!Number.isFinite(listing.soldPrice) || listing.soldPrice <= 0) return false;
  if (titleLooksLikeAccessoryOrPackaging(listing.title)) return false;
  return true;
}

type MappedRow = {
  title: string;
  soldPrice: number;
  soldAt: Date;
  itemUrl?: string | null;
  itemId?: string | null;
  imageUrl?: string | null;
  conditionLabel?: string | null;
  raw?: unknown;
};

function mappedRowToListingForValidation(row: MappedRow): ScrapedSoldListing {
  return {
    title: row.title,
    soldPrice: row.soldPrice,
    soldAt: row.soldAt,
    itemUrl: row.itemUrl ?? null,
    itemId: row.itemId ?? null,
    imageUrl: row.imageUrl ?? null,
    conditionLabel: row.conditionLabel ?? null,
    raw: row.raw,
  };
}

/**
 * Maps caffein.dev/ebay-sold-listings dataset items to internal sold rows.
 * Field names follow the actor output schema (endedAt, soldPrice, url, title, itemId, etc.).
 */
export function mapApifyEbaySoldItemsToListings(
  items: ApifyItem[],
  keyword: string,
  conditionBucket: ConditionBucket,
): ScrapedSoldListing[] {
  const storeRaw = storeRawPayload();
  const parsed: MappedRow[] = items
    .map((it) => {
      const title = getStr(it.title) ?? getStr(it.name) ?? keyword;
      // Important: do NOT fall back to generic `price` or `totalPrice` here.
      // `totalPrice` often includes shipping and can differ from true sold price; BO rows are unreliable.
      // We only accept fields that are intended to represent a final sold amount.
      const soldPriceRaw = it.soldPrice ?? it.finalPrice;
      const soldPrice = parseMoneyField(soldPriceRaw);
      const soldAt = parseSoldAt(it);
      const rawUrl = getStr(it.url) ?? getStr(it.itemUrl) ?? getStr(it.listingUrl);
      // Resolve id for dedupe / validation; never pair search URLs with a loose itemId (wrong /itm/).
      const stableId = listingItemIdFromActorFields(it.itemId, rawUrl);
      const hasTrustworthyListingUrl = Boolean(rawUrl && !isEbaySearchOrBrowseUrl(rawUrl));
      // View link: strip actor tracking (`itmmeta`, `itmprp`, …) by using canonical /itm/{id} when we trust the
      // URL context. If the actor sends only `itemId` with no listing URL, keep link unset (do not invent URLs).
      const itemUrl =
        stableId && hasTrustworthyListingUrl
          ? canonicalEbayItemUrl(stableId)
          : hasTrustworthyListingUrl
            ? rawUrl
            : undefined;
      const imageUrl =
        getStr(it.imageUrl) ??
        getStr(it.image) ??
        getStr(it.thumbnail) ??
        getStr(it.pictureUrl) ??
        getStr(it.pictureURL) ??
        getStr(it.galleryURL) ??
        getStr(it.galleryUrl) ??
        getStr(it.photo) ??
        (typeof it.picture === "string" ? getStr(it.picture) : null) ??
        firstPictureFromActor(it.pictures);
      const condition =
        getStr(it.condition) ??
        getStr(it.itemCondition) ??
        (typeof it.itemSpecifics === "object" && it.itemSpecifics && "Condition" in (it.itemSpecifics as object)
          ? getStr((it.itemSpecifics as Record<string, unknown>).Condition)
          : null);
      return {
        raw: it,
        title,
        soldPrice,
        soldAt: soldAt ?? new Date(0),
        itemUrl: itemUrl ?? undefined,
        itemId: stableId ?? undefined,
        imageUrl: imageUrl ?? undefined,
        conditionLabel: condition ?? undefined,
      };
    })
    .filter((row) => isValidSoldListing(mappedRowToListingForValidation(row)))
    .filter((row) =>
      soldListingTitleMatchesBucket(row.title, conditionBucket, row.conditionLabel ?? null),
    );

  const sorted = [...parsed].sort((a, b) => b.soldAt.getTime() - a.soldAt.getTime());

  function itemUrlLooksLikeRealListing(url: string | null | undefined): boolean {
    const u = url?.trim();
    if (!u) return false;
    if (isEbaySearchOrBrowseUrl(u)) return false;
    return /\/itm\/(?:[^/]+\/)?\d{10,}/i.test(u) || /[?&](?:item|itemId)=\d{10,}\b/i.test(u);
  }

  // Deduplicate by item id when available; prefer newer rows first, then a URL that looks like a real item page.
  const byKey = new Map<string, MappedRow>();
  for (const row of sorted) {
    const idKey = normalizeEbayItemId(row.itemId, row.itemUrl ?? undefined);
    const key = idKey ?? row.itemUrl?.trim() ?? `${row.title}|${row.soldPrice}|${row.soldAt.getTime()}`;

    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, row);
      continue;
    }
    const existingGood = itemUrlLooksLikeRealListing(existing.itemUrl);
    const currentGood = itemUrlLooksLikeRealListing(row.itemUrl);
    if (!existingGood && currentGood) {
      byKey.set(key, row);
    }
  }

  const deduped = Array.from(byKey.values()).sort((a, b) => b.soldAt.getTime() - a.soldAt.getTime());

  // Do not expose per-listing eBay URLs downstream (we do not persist or show them).
  return deduped.map((r) => ({
    title: r.title,
    soldPrice: r.soldPrice,
    soldAt: r.soldAt,
    itemUrl: null,
    itemId: r.itemId ?? null,
    imageUrl: r.imageUrl ?? null,
    conditionLabel: r.conditionLabel ?? null,
    raw: storeRaw ? r.raw : undefined,
  }));
}

function computeMedian(prices: number[]): number {
  if (prices.length === 0) return 0;
  const s = [...prices].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[mid - 1]! + s[mid]!) / 2 : s[mid]!;
}

async function fetchEbaySoldListingsDataset(
  actorId: string,
  keyword: string,
  count: number,
  waitSec: number,
): Promise<ApifyItem[]> {
  const body = {
    keyword,
    count,
    daysToScrape: daysToScrape(),
    ebaySite: process.env.APIFY_EBAY_SITE?.trim() || "ebay.com",
    sortOrder: "endedRecently" as const,
    itemCondition: "any",
    itemLocation: "default",
    currencyMode: "USD",
    detailedSearch: process.env.APIFY_EBAY_DETAILED_SEARCH === "true",
  };

  const runRes = await apifyFetch(
    `/acts/${encodeURIComponent(actorId)}/runs?waitForFinish=${waitSec}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );

  const runJson = (await runRes.json()) as { data: ApifyRun };
  let run = runJson.data;

  // `waitForFinish` can return while status is still RUNNING (Apify limit vs queue + actor runtime). Keep polling long
  // enough that a run that succeeds in the Apify UI still has time to reach SUCCEEDED here (see APIFY_RUN_TIMEOUT).
  const pollBudgetMs = Math.max(300_000, waitSec * 1000 + 120_000);
  const pollUntil = Date.now() + pollBudgetMs;
  if (run.status !== "SUCCEEDED") {
    run = await waitForRunSucceededOrThrow(run, pollUntil);
  }

  const fetchItemsOnce = async (): Promise<ApifyItem[]> => {
    const itemsRes = await apifyFetch(
      `/datasets/${encodeURIComponent(run.defaultDatasetId)}/items?format=json`,
    );
    const rawItems = await itemsRes.json();
    return normalizeDatasetItemsJson(rawItems);
  };

  let items = await fetchItemsOnce();
  if (items.length === 0) {
    await new Promise((r) => setTimeout(r, 2000));
    items = await fetchItemsOnce();
  }

  return items;
}

export type RunEbaySoldListingsInput = {
  keyword: string;
  normalizedCardIdentifier: string;
  conditionBucket: ConditionBucket;
  cacheKey?: string;
};

/**
 * Single Apify run: up to **8** sold rows (`CANDIDATE_FETCH_COUNT`). Rows are mapped and deduped; only invalid
 * sold prices are dropped. Returns up to **5** listings (`MAX_VALID_SOLD_LISTINGS`).
 */
export async function runEbaySoldListingsActor(input: RunEbaySoldListingsInput): Promise<ScrapedCardSnapshot> {
  const actorId = getEbaySoldListingsActorId();
  const started = Date.now();

  logSoldScrapeMetric({
    event: "apify_ebay_sold",
    outcome: "apify_run_start",
    cacheKey: input.cacheKey,
    normalizedQuery: input.keyword,
  });

  if (process.env.EBAY_SKIP_NO_EXACT_MATCH_PREFLIGHT !== "true") {
    const serpHtml = await fetchEbaySoldSearchPageHtml(input.keyword);
    if (serpHtml && ebaySoldSearchHtmlIndicatesNoExactMatches(serpHtml)) {
      const durationMs = Date.now() - started;
      logSoldScrapeMetric({
        event: "apify_ebay_sold",
        outcome: "apify_run_no_exact_ebay_matches",
        cacheKey: input.cacheKey,
        normalizedQuery: input.keyword,
        durationMs,
        listingCount: 0,
      });
      return {
        normalizedCardIdentifier: input.normalizedCardIdentifier,
        displayName: input.keyword,
        soldListings: [],
        averagePrice: 0,
        medianPrice: 0,
        minPrice: 0,
        maxPrice: 0,
        scrapedAt: new Date(),
      };
    }
  }

  const waitSec = waitForFinishSeconds();
  let soldListings: ScrapedSoldListing[] = [];
  let durationMs = 0;
  let lastItems: ApifyItem[] = [];

  const items = await fetchEbaySoldListingsDataset(actorId, input.keyword, CANDIDATE_FETCH_COUNT, waitSec);
  lastItems = items;
  const mapped = mapApifyEbaySoldItemsToListings(items, input.keyword, input.conditionBucket);

  soldListings = mapped.sort((a, b) => b.soldAt.getTime() - a.soldAt.getTime()).slice(0, maxValidSoldListings());

  if (process.env.NODE_ENV === "development") {
    // eslint-disable-next-line no-console
    console.info("[ebay-sold]", {
      cacheKey: input.cacheKey,
      scrapeCount: CANDIDATE_FETCH_COUNT,
      rawItems: items.length,
      mapped: mapped.length,
      returned: soldListings.length,
    });
  }
  durationMs = Date.now() - started;

  if (soldListings.length === 0) {
    if (process.env.NODE_ENV === "development" && lastItems.length > 0) {
      // eslint-disable-next-line no-console
      console.warn(
        "[ebay-sold] Actor returned items but none mapped; first record keys:",
        Object.keys(lastItems[0] ?? {}),
      );
    }
    logSoldScrapeMetric({
      event: "apify_ebay_sold",
      outcome: "apify_run_zero_results",
      cacheKey: input.cacheKey,
      normalizedQuery: input.keyword,
      durationMs,
      listingCount: 0,
    });
    // Successful run with no matching sales — persist an empty cache so the UI stops "fetching" and
    // does not retry forever (previously we threw, which failed the job and left no CardCache row).
    return {
      normalizedCardIdentifier: input.normalizedCardIdentifier,
      displayName: input.keyword,
      soldListings: [],
      averagePrice: 0,
      medianPrice: 0,
      minPrice: 0,
      maxPrice: 0,
      scrapedAt: new Date(),
    };
  }

  const prices = soldListings.map((l) => l.soldPrice);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const average = computeDisplayedAveragePrice(prices);
  const medianPrice = computeMedian(prices);

  logSoldScrapeMetric({
    event: "apify_ebay_sold",
    outcome: "apify_run_success",
    cacheKey: input.cacheKey,
    normalizedQuery: input.keyword,
    durationMs,
    listingCount: soldListings.length,
  });

  return {
    normalizedCardIdentifier: input.normalizedCardIdentifier,
    displayName: input.keyword,
    soldListings,
    averagePrice: average.displayedAveragePrice ?? 0,
    medianPrice: Math.round(medianPrice * 100) / 100,
    minPrice: Math.round(minPrice * 100) / 100,
    maxPrice: Math.round(maxPrice * 100) / 100,
    scrapedAt: new Date(),
  };
}
