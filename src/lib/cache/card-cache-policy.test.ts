import { describe, expect, it } from "vitest";
import { getCardCachePolicy, cachePolicyTtlMs, type CardSearchStats } from "./card-cache-policy";

const base: CardSearchStats = {
  lastSearchedAt: null,
  searchCount24h: 0,
  searchCount7d: 0,
  searchCount30d: 0,
  uniqueUsers7d: 0,
};

describe("getCardCachePolicy", () => {
  it("HOT: searchCount7d >= 5 → 24h", () => {
    const r = getCardCachePolicy({ ...base, searchCount7d: 5 });
    expect(r.temperature).toBe("hot");
    expect(r.ttlHours).toBe(24);
    expect(cachePolicyTtlMs(r)).toBe(24 * 60 * 60 * 1000);
    expect(r.reasons.some((x) => x.includes("searchCount7d"))).toBe(true);
  });

  it("HOT: searchCount24h >= 2 → 24h", () => {
    const r = getCardCachePolicy({ ...base, searchCount24h: 2 });
    expect(r.temperature).toBe("hot");
    expect(r.ttlHours).toBe(24);
  });

  it("HOT: uniqueUsers7d >= 3 → 24h", () => {
    const r = getCardCachePolicy({ ...base, uniqueUsers7d: 3 });
    expect(r.temperature).toBe("hot");
    expect(r.ttlHours).toBe(24);
  });

  it("COLD: searchCount30d <= 1 and searchCount7d === 0 → 72h", () => {
    const r = getCardCachePolicy({ ...base, searchCount30d: 1, searchCount7d: 0 });
    expect(r.temperature).toBe("cold");
    expect(r.ttlHours).toBe(72);
  });

  it("DEFAULT: neither hot nor cold → 48h", () => {
    const r = getCardCachePolicy({ ...base, searchCount7d: 1, searchCount30d: 3 });
    expect(r.temperature).toBe("default");
    expect(r.ttlHours).toBe(48);
  });
});
