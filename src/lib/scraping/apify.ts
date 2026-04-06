import type {
  ScrapedActiveSnapshot,
  ScrapedCardSnapshot,
  ScrapingProvider,
} from "./types";

type ApifyRun = { id: string; defaultDatasetId: string };
type ApifyItem = Record<string, unknown>;

async function apifyFetch(path: string, init?: RequestInit) {
  const token = process.env.APIFY_TOKEN;
  if (!token) throw new Error("Missing APIFY_TOKEN");
  const url = `https://api.apify.com/v2${path}${path.includes("?") ? "&" : "?"}token=${encodeURIComponent(token)}`;
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`Apify API ${res.status}`);
  return res;
}

export const apifyScrapingProvider: ScrapingProvider = {
  async scrapeSoldSnapshot({ normalizedCardIdentifier, queryText }): Promise<ScrapedCardSnapshot> {
    const actorId = process.env.APIFY_ACTOR_ID;
    if (!actorId) throw new Error("Missing APIFY_ACTOR_ID");

    // Start an Apify actor run.
    // TODO(scraper): Replace `input` schema to match your specific actor (eBay sold listings).
    const runRes = await apifyFetch(`/acts/${encodeURIComponent(actorId)}/runs?waitForFinish=60`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: queryText,
        // Important: scrape SOLD listings only (actor-specific config).
        soldOnly: true,
        maxItems: 10,
      }),
    });

    const runJson = (await runRes.json()) as { data: ApifyRun };
    const run = runJson.data;

    // Pull items from the default dataset.
    // TODO(scraper): Map actor output to ScrapedSoldListing fields.
    const itemsRes = await apifyFetch(
      `/datasets/${encodeURIComponent(run.defaultDatasetId)}/items?clean=true&format=json`,
    );
    const items = (await itemsRes.json()) as ApifyItem[];

    // Normalize and keep only the 5 most recent SOLD listings.
    // TODO(scraper): Ensure soldAt parsing and SOLD-only correctness.
    const getStr = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v : null);
    const getNum = (v: unknown): number => (typeof v === "number" ? v : Number(v));
    const normalized = items
      .map((it) => {
        const title = getStr(it.title) ?? getStr(it.name) ?? queryText;
        const soldPrice = getNum(it.soldPrice ?? it.price);
        const soldAt = new Date(String(it.soldAt ?? it.soldDate ?? Date.now()));
        const itemUrl = getStr(it.url) ?? getStr(it.itemUrl);
        const itemId = getStr(it.itemId) ?? getStr(it.id);
        const imageUrl = getStr(it.imageUrl) ?? getStr(it.image);
        return { title, soldPrice, soldAt, itemUrl, itemId, imageUrl, raw: it };
      })
      .filter((x) => Number.isFinite(x.soldPrice) && x.soldPrice > 0 && x.soldAt instanceof Date && !Number.isNaN(x.soldAt.getTime()))
      .sort((a, b) => b.soldAt.getTime() - a.soldAt.getTime())
      .slice(0, 5);

    if (normalized.length < 5) {
      throw new Error("SCRAPE_INSUFFICIENT_RESULTS");
    }

    const prices = normalized.map((n) => n.soldPrice);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const averagePrice = prices.reduce((a, b) => a + b, 0) / prices.length;

    return {
      normalizedCardIdentifier,
      displayName: queryText,
      soldListings: normalized,
      averagePrice: Math.round(averagePrice * 100) / 100,
      minPrice: Math.round(minPrice * 100) / 100,
      maxPrice: Math.round(maxPrice * 100) / 100,
      scrapedAt: new Date(),
    };
  },

  async scrapeActiveListings({ queryText, maxItems }): Promise<ScrapedActiveSnapshot> {
    const actorId = process.env.APIFY_ACTOR_ACTIVE_ID ?? process.env.APIFY_ACTOR_ID;
    if (!actorId) throw new Error("Missing APIFY_ACTOR_ACTIVE_ID or APIFY_ACTOR_ID");

    const runRes = await apifyFetch(`/acts/${encodeURIComponent(actorId)}/runs?waitForFinish=60`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: queryText,
        buyItNowOnly: true,
        maxItems,
      }),
    });

    const runJson = (await runRes.json()) as { data: ApifyRun };
    const run = runJson.data;

    const itemsRes = await apifyFetch(
      `/datasets/${encodeURIComponent(run.defaultDatasetId)}/items?clean=true&format=json`,
    );
    const items = (await itemsRes.json()) as ApifyItem[];

    const getStr = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v : null);
    const getNum = (v: unknown): number => (typeof v === "number" ? v : Number(v));

    const listings = items
      .map((it) => {
        const title = getStr(it.title) ?? getStr(it.name) ?? queryText;
        const price = getNum(it.price ?? it.buyItNowPrice);
        const shippingPrice = it.shipping !== undefined ? getNum(it.shipping) : null;
        const listingUrl = getStr(it.url) ?? getStr(it.itemUrl) ?? "";
        const itemId = getStr(it.itemId) ?? getStr(it.id);
        return {
          title,
          price,
          shippingPrice: Number.isFinite(shippingPrice) ? shippingPrice : null,
          currency: "USD",
          listingUrl,
          itemId,
          sellerLabel: getStr(it.seller),
          isBuyItNow: true,
          raw: it,
        };
      })
      .filter((x) => Number.isFinite(x.price) && x.price > 0 && x.listingUrl.length > 0)
      .slice(0, maxItems);

    return {
      normalizedCardIdentifier: queryText,
      listings,
      scrapedAt: new Date(),
    };
  },
};

