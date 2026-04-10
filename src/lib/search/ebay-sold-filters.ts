import type { ConditionBucket } from "@prisma/client";

/** Third-party slab / grading services we exclude from raw bucket results. */
export function isLikelyGradedListingTitle(title: string): boolean {
  const t = title;
  return (
    /\bPSA\b/i.test(t) ||
    /\bBGS\b/i.test(t) ||
    /\bCGC\b/i.test(t) ||
    /\bSGC\b/i.test(t) ||
    /\bBECKETT\b/i.test(t) ||
    /\bTAG\s*GRADING\b/i.test(t)
  );
}

/** Title/label text that clearly indicates a different PSA grade than requested (cross-bucket guard). */
function combinedImpliesConflictingPsaGrade(combined: string, bucket: ConditionBucket): boolean {
  const t = combined;
  const has10 = /\bPSA\s*10\b/i.test(t) || /\bPSA10\b/i.test(t) || /\bPSA-10\b/i.test(t);
  const has9 = /\bPSA\s*9\b/i.test(t) || /\bPSA9\b/i.test(t) || /\bPSA-9\b/i.test(t);
  const has8 = /\bPSA\s*8\b/i.test(t) || /\bPSA8\b/i.test(t) || /\bPSA-8\b/i.test(t);

  if (bucket === "psa_10") {
    if (has10) return false;
    if (has9 || has8) return true;
  }
  if (bucket === "psa_9") {
    if (has9) return false;
    if (has10 || has8) return true;
  }
  if (bucket === "psa_8") {
    if (has8) return false;
    if (has10 || has9) return true;
  }
  return false;
}

function keywordEncodesPsaBucket(keyword: string | null | undefined, bucket: ConditionBucket): boolean {
  if (!keyword?.trim()) return false;
  const k = keyword;
  if (bucket === "psa_10") {
    return (
      /\bPSA\s*10\b/i.test(k) ||
      /\bPSA10\b/i.test(k) ||
      /\bPSA-10\b/i.test(k) ||
      /\bGEM\s*MINT\s*10\b/i.test(k) ||
      /\bGEM\s*MT\s*10\b/i.test(k)
    );
  }
  if (bucket === "psa_9") {
    return /\bPSA\s*9\b/i.test(k) || /\bPSA9\b/i.test(k) || /\bPSA-9\b/i.test(k);
  }
  if (bucket === "psa_8") {
    return /\bPSA\s*8\b/i.test(k) || /\bPSA8\b/i.test(k) || /\bPSA-8\b/i.test(k);
  }
  return false;
}

function titleMatchesPsa10(combined: string): boolean {
  return (
    /\bPSA\s*10\b/i.test(combined) ||
    /\bPSA10\b/i.test(combined) ||
    /\bPSA-10\b/i.test(combined) ||
    /\bPSA\s*#\s*10\b/i.test(combined) ||
    /\bPSA\s*GEM\b/i.test(combined) ||
    /\bGEM\s*MINT\s*10\b/i.test(combined) ||
    /\bGEM\s*MT\s*10\b/i.test(combined)
  );
}

function titleMatchesPsa9(combined: string): boolean {
  return /\bPSA\s*9\b/i.test(combined) || /\bPSA9\b/i.test(combined) || /\bPSA-9\b/i.test(combined);
}

function titleMatchesPsa8(combined: string): boolean {
  return /\bPSA\s*8\b/i.test(combined) || /\bPSA8\b/i.test(combined) || /\bPSA-8\b/i.test(combined);
}

/**
 * Keep sold rows that match the user's condition bucket (title-level heuristic).
 * Raw buckets drop slab listings; PSA buckets require that grade in the title/label, or — when the sold-search
 * keyword already encodes the grade — titles that do not contradict another PSA grade (eBay often truncates titles).
 */
export function soldListingTitleMatchesBucket(
  title: string,
  bucket: ConditionBucket,
  conditionLabel?: string | null,
  searchKeyword?: string | null,
): boolean {
  const combined = `${title ?? ""} ${conditionLabel ?? ""}`.trim();
  if (bucket.startsWith("raw_")) {
    return !isLikelyGradedListingTitle(combined);
  }
  if (bucket === "psa_10") {
    if (titleMatchesPsa10(combined)) return true;
    if (keywordEncodesPsaBucket(searchKeyword, "psa_10") && !combinedImpliesConflictingPsaGrade(combined, "psa_10")) {
      return true;
    }
    return false;
  }
  if (bucket === "psa_9") {
    if (titleMatchesPsa9(combined)) return true;
    if (keywordEncodesPsaBucket(searchKeyword, "psa_9") && !combinedImpliesConflictingPsaGrade(combined, "psa_9")) {
      return true;
    }
    return false;
  }
  if (bucket === "psa_8") {
    if (titleMatchesPsa8(combined)) return true;
    if (keywordEncodesPsaBucket(searchKeyword, "psa_8") && !combinedImpliesConflictingPsaGrade(combined, "psa_8")) {
      return true;
    }
    return false;
  }
  return true;
}

/** True when the URL is a search/browse page — never pair these with `itemId` from the actor. */
export function isEbaySearchOrBrowseUrl(listingUrl: string): boolean {
  return (
    /\/sch\//i.test(listingUrl) ||
    /\/b\/i\//i.test(listingUrl) ||
    /\/i\.html/i.test(listingUrl) ||
    /[?&]_nkw=/i.test(listingUrl)
  );
}

/** Extract stable eBay listing id (digits only, length ≥ 10). */
export function normalizeEbayItemId(itemId: unknown, listingUrl: string | undefined): string | null {
  // Prefer the id embedded in the URL (it is what we can actually link to).
  if (listingUrl) {
    // Handles:
    // - /itm/123456789012
    // - /itm/title/123456789012
    // - /itm/123456789012?hash=...
    const m = listingUrl.match(/\/itm\/(?:[^/]+\/)?(\d{10,})/);
    if (m?.[1]) return m[1];

    // Legacy ViewItem / redirect URLs (no /itm/ segment in path).
    try {
      const u = new URL(listingUrl, "https://www.ebay.com");
      const q = u.searchParams.get("itemId") ?? u.searchParams.get("item");
      if (q && /^\d{10,}$/.test(q.trim())) return q.trim();
    } catch {
      /* ignore */
    }
    const qm = listingUrl.match(/[?&](?:item|itemId)=(\d{10,})\b/);
    if (qm?.[1]) return qm[1];

    // Search/browse pages: do not fall back to actor `itemId` (can be unrelated to the page).
    if (isEbaySearchOrBrowseUrl(listingUrl)) return null;
  }

  if (itemId != null) {
    const s = String(itemId).trim();
    if (/^\d{10,}$/.test(s)) return s;
    const m = s.match(/(\d{10,})/);
    if (m?.[1]) return m[1];
  }

  return null;
}

export function canonicalEbayItemUrl(itemId: string): string {
  return `https://www.ebay.com/itm/${itemId}`;
}

/**
 * Resolves the listing id for links and dedupe. Prefer the id embedded in the actor's `url` when it is a real
 * item or ViewItem URL. Search/browse pages do **not** fall back to `itemId` (wrong /itm/ links). If the URL is
 * present but has no parseable id, fall back to `itemId`; if `url` is missing entirely, use `itemId` only.
 */
export function listingItemIdFromActorFields(itemId: unknown, rawUrl: string | null | undefined): string | null {
  const url = rawUrl?.trim();
  if (url) {
    if (isEbaySearchOrBrowseUrl(url)) return null;
    const fromUrl = normalizeEbayItemId(undefined, url);
    if (fromUrl) return fromUrl;
    return normalizeEbayItemId(itemId, undefined);
  }
  return normalizeEbayItemId(itemId, undefined);
}
