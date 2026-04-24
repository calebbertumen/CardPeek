import type { ScrapedSoldListing } from "@/lib/scraping/types";
import { normalizeEbayItemId } from "@/lib/search/ebay-sold-filters";

function fingerprintKey(listing: ScrapedSoldListing): string {
  const id = normalizeEbayItemId(listing.itemId, listing.itemUrl ?? undefined);
  if (id) return `id:${id}`;
  const title = listing.title.trim().toLowerCase().replace(/\s+/g, " ");
  return `fp:${title}|${listing.soldPrice}|${listing.soldAt.getTime()}`;
}

/**
 * Merges two sold-listing arrays (newest first), deduping by item id when present, otherwise title+price+date.
 */
export function mergeDedupeSoldListings(
  primary: ScrapedSoldListing[],
  secondary: ScrapedSoldListing[],
  max: number,
): ScrapedSoldListing[] {
  const merged = [...primary, ...secondary].sort((a, b) => b.soldAt.getTime() - a.soldAt.getTime());
  const seen = new Set<string>();
  const out: ScrapedSoldListing[] = [];
  for (const l of merged) {
    const k = fingerprintKey(l);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(l);
    if (out.length >= max) break;
  }
  return out;
}
