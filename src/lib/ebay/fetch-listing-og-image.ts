const EBAY_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

function parseOgImage(html: string): string | null {
  const patterns = [
    /property=["']og:image["'][^>]*content=["']([^"']+)["']/i,
    /content=["']([^"']+)["'][^>]*property=["']og:image["']/i,
    /property=["']og:image:secure_url["'][^>]*content=["']([^"']+)["']/i,
    /name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i,
    /content=["']([^"']+)["'][^>]*name=["']twitter:image["']/i,
  ];
  for (const p of patterns) {
    const m = html.match(p);
    const raw = m?.[1]?.trim();
    if (!raw) continue;
    const decoded = raw.replace(/&amp;/g, "&").replace(/&quot;/g, '"');
    if (decoded.startsWith("https://")) return decoded;
  }
  const ld = html.match(/"image"\s*:\s*"(https:[^"]+)"/);
  if (ld?.[1]?.startsWith("https://")) return ld[1];
  return null;
}

function isAllowedEbayListingUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return false;
    const h = u.hostname.toLowerCase();
    return (
      h === "www.ebay.com" ||
      h === "ebay.com" ||
      h.endsWith(".ebay.com") ||
      h.endsWith(".ebay.co.uk") ||
      h.endsWith(".ebay.de") ||
      h.endsWith(".ebay.fr") ||
      h.endsWith(".ebay.it") ||
      h.endsWith(".ebay.es") ||
      h.endsWith(".ebay.ca") ||
      h.endsWith(".ebay.com.au")
    );
  } catch {
    return false;
  }
}

/**
 * Loads the public listing HTML and reads the primary image URL (og:image / JSON-LD).
 * The Apify sold-listings actor does not return thumbnails in its default output; this fills the gap.
 */
export async function fetchEbayListingOgImageUrl(listingUrl: string): Promise<string | null> {
  if (!listingUrl?.trim() || !isAllowedEbayListingUrl(listingUrl.trim())) {
    return null;
  }
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 12_000);
  try {
    const res = await fetch(listingUrl.trim(), {
      redirect: "follow",
      signal: ac.signal,
      headers: {
        "User-Agent": EBAY_UA,
        Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    if (!res.ok) return null;
    const html = await res.text();
    if (html.length < 40) return null;
    return parseOgImage(html);
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}
