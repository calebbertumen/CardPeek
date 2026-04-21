import { buildEbaySoldListingsSearchUrl } from "@/lib/search/sold-search-query";

/**
 * eBay www host for HTML preflight (aligned with {@link APIFY_EBAY_SITE}).
 */
export function resolveEbayWwwHost(): string {
  const raw = (process.env.APIFY_EBAY_SITE ?? "ebay.com").trim().toLowerCase();
  const base = raw.replace(/^www\./, "");
  return `www.${base}`;
}

/**
 * When eBay has no listings that satisfy the full query, it still returns a SERP of
 * "similar" sold items ("Results matching fewer words"). Those rows are not reliable for
 * CardPeek pricing  -  treat as no data (same as zero Apify rows).
 *
 * Copy varies slightly by locale/A-B tests; keep patterns conservative.
 */
export function ebaySoldSearchHtmlIndicatesNoExactMatches(html: string): boolean {
  if (!html || html.length < 400) return false;
  const h = html.toLowerCase();

  if (h.includes("results matching fewer words")) return true;
  if (h.includes("result matching fewer words")) return true;
  if (h.includes("no exact matches found")) return true;

  return false;
}

export async function fetchEbaySoldSearchPageHtml(keyword: string): Promise<string | null> {
  const host = resolveEbayWwwHost();
  const url = buildEbaySoldListingsSearchUrl(keyword, host);
  try {
    const res = await fetch(url, {
      cache: "no-store",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    if (!res.ok) return null;
    const text = await res.text();
    return text.length > 0 ? text : null;
  } catch {
    return null;
  }
}
