type ScrapeMetricPayload = {
  event: "apify_ebay_sold";
  cacheKey?: string;
  normalizedQuery?: string;
  outcome:
    | "cache_hit"
    | "cache_miss"
    | "apify_run_start"
    | "apify_run_success"
    | "apify_run_zero_results"
    | "apify_run_no_exact_ebay_matches"
    | "apify_run_failure";
  durationMs?: number;
  listingCount?: number;
  error?: string;
};

export function logSoldScrapeMetric(payload: ScrapeMetricPayload): void {
  const line = JSON.stringify({
    ...payload,
    ts: new Date().toISOString(),
  });
  if (process.env.NODE_ENV === "development") {
    // eslint-disable-next-line no-console
    console.log("[scrape-metric]", line);
  } else {
    // eslint-disable-next-line no-console
    console.log(line);
  }
}
