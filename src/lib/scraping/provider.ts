import type { ScrapingProvider } from "./types";
import { mockScrapingProvider } from "./mock";
import { apifyScrapingProvider } from "./apify";

let loggedMockHint = false;

export function getScrapingProvider(): ScrapingProvider {
  const p = (process.env.SCRAPING_PROVIDER || "").toLowerCase();
  if (p === "apify") return apifyScrapingProvider;
  if (process.env.NODE_ENV === "development" && !loggedMockHint) {
    loggedMockHint = true;
    console.info(
      "[CardPeek] Using mock sold listings (set SCRAPING_PROVIDER=apify + APIFY_TOKEN for real eBay comps).",
    );
  }
  return mockScrapingProvider;
}

