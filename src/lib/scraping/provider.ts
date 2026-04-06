import type { ScrapingProvider } from "./types";
import { mockScrapingProvider } from "./mock";
import { apifyScrapingProvider } from "./apify";

export function getScrapingProvider(): ScrapingProvider {
  const p = (process.env.SCRAPING_PROVIDER || "").toLowerCase();
  if (p === "apify") return apifyScrapingProvider;
  // Default to mock in development / MVP until configured.
  return mockScrapingProvider;
}

