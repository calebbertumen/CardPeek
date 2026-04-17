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

function rawConditionSignals(combined: string): {
  nm: boolean;
  lp: boolean;
  mp: boolean;
  hp: boolean;
  dmg: boolean;
} {
  const t = combined;
  // Keep these patterns intentionally conservative: we only want to act on *explicit* signals.
  const nm =
    /\bnear\s*mint\b/i.test(t) ||
    /\bnm\b/i.test(t) ||
    /\bmint\b/i.test(t) ||
    /\bminty\b/i.test(t);
  const lp =
    /\blightly\s*played\b/i.test(t) ||
    /\blp\b/i.test(t) ||
    /\blight\s*play(?:ed)?\b/i.test(t);
  const mp =
    /\bmoderately\s*played\b/i.test(t) ||
    /\bmp\b/i.test(t) ||
    /\bmod(?:erate(?:ly)?)?\s*play(?:ed)?\b/i.test(t);
  const hp =
    /\bheavily\s*played\b/i.test(t) ||
    /\bhp\b/i.test(t) ||
    /\bheavy\s*play(?:ed)?\b/i.test(t);
  const dmg =
    /\bdamaged\b/i.test(t) ||
    /\bdmg\b/i.test(t) ||
    /\bpoor\b/i.test(t) ||
    /\bcreases?\b/i.test(t) ||
    /\bwater\s*damage\b/i.test(t) ||
    /\btear(?:s|ed)?\b/i.test(t);
  return { nm, lp, mp, hp, dmg };
}

function rawListingMatchesBucket(combined: string, bucket: ConditionBucket): boolean {
  const s = rawConditionSignals(combined);
  if (bucket === "raw_nm") {
    // Reject explicit worse conditions (LP/MP/HP/DMG). If no explicit condition is present, keep it.
    return !(s.lp || s.mp || s.hp || s.dmg);
  }
  if (bucket === "raw_lp") {
    // Must not be clearly worse than LP; also reject explicit NM so NM searches don't bleed both ways.
    if (s.mp || s.hp || s.dmg) return false;
    if (s.nm) return false;
    // If explicit LP is present, accept; if no explicit markers, accept (many listings omit condition).
    return true;
  }
  if (bucket === "raw_mp_hp") {
    // Reject explicit NM/LP; keep MP/HP/DMG and "no explicit condition" results.
    if (s.nm || s.lp) return false;
    return true;
  }
  return true;
}

/** Every explicit `PSA <n>` mention in title + condition text. */
function psaGradesInCombinedText(combined: string): number[] {
  const out: number[] = [];
  const re = /\bPSA\s*(\d{1,2})\b/gi;
  let m;
  while ((m = re.exec(combined)) !== null) {
    const n = parseInt(m[1], 10);
    if (Number.isFinite(n)) out.push(n);
  }
  return out;
}

/** Non-PSA slabs — never treat as the user's PSA bucket. */
function mentionsCompetitorGradingSlab(combined: string): boolean {
  return /\bCGC\b/i.test(combined) || /\bBGS\b/i.test(combined) || /\bSGC\b/i.test(combined) || /\bBECKETT\b/i.test(combined);
}

function psaBucketExplicitGradesAreOnly(
  combined: string,
  allowed: number,
): boolean {
  const grades = psaGradesInCombinedText(combined);
  if (grades.length === 0) return true;
  return grades.every((g) => g === allowed);
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
 * Keep sold rows that match the user's condition bucket (title + condition label heuristics).
 * PSA buckets require that grade (or Gem Mint 10 variants) in the listing text — we do **not** infer PSA from
 * the search keyword alone (that let in wrong cards/grades when eBay broadened results).
 */
export function soldListingTitleMatchesBucket(
  title: string,
  bucket: ConditionBucket,
  conditionLabel?: string | null,
): boolean {
  const combined = `${title ?? ""} ${conditionLabel ?? ""}`.trim();
  if (bucket.startsWith("raw_")) {
    if (isLikelyGradedListingTitle(combined)) return false;
    return rawListingMatchesBucket(combined, bucket);
  }
  if (bucket === "psa_10") {
    if (mentionsCompetitorGradingSlab(combined)) return false;
    if (!titleMatchesPsa10(combined)) return false;
    return psaBucketExplicitGradesAreOnly(combined, 10);
  }
  if (bucket === "psa_9") {
    if (mentionsCompetitorGradingSlab(combined)) return false;
    if (!titleMatchesPsa9(combined)) return false;
    return psaBucketExplicitGradesAreOnly(combined, 9);
  }
  if (bucket === "psa_8") {
    if (mentionsCompetitorGradingSlab(combined)) return false;
    if (!titleMatchesPsa8(combined)) return false;
    return psaBucketExplicitGradesAreOnly(combined, 8);
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
