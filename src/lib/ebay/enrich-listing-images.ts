import { fetchEbayListingOgImageUrl } from "@/lib/ebay/fetch-listing-og-image";

const TTL_MS = 7 * 24 * 60 * 60 * 1000;
const cache = new Map<string, { value: string | null; expires: number }>();

async function getListingImageUrlCached(listingUrl: string): Promise<string | null> {
  const now = Date.now();
  const hit = cache.get(listingUrl);
  if (hit && hit.expires > now) {
    return hit.value;
  }
  const value = await fetchEbayListingOgImageUrl(listingUrl);
  cache.set(listingUrl, { value, expires: now + TTL_MS });
  return value;
}

/**
 * Fills `imageUrl` when the sold-listings actor did not provide one, by loading each listing page once
 * and reading og:image (cached in-memory for this process).
 */
export async function enrichSoldListingImages<T extends { listingUrl: string; imageUrl: string | null }>(
  rows: T[],
): Promise<T[]> {
  const resolved = await Promise.all(
    rows.map(async (row) => {
      if (row.imageUrl?.trim()) return row;
      const u = row.listingUrl?.trim();
      if (!u) return row;
      const img = await getListingImageUrlCached(u);
      if (!img) return row;
      return { ...row, imageUrl: img };
    }),
  );
  return resolved;
}
