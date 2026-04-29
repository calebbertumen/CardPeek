import { describe, expect, it } from "vitest";
import { buildSoldConditionFallbackRawCacheKey } from "@/lib/normalize";
import {
  buildBroadRawEbaySoldSearchKeyword,
  buildConditionFallbackEbaySoldSearchKeyword,
  buildEbaySoldListingsSearchUrl,
  buildEbaySoldSearchKeyword,
  buildRawMpHpFallbackEbaySearchKeywords,
  normalizeSoldSearchKeywordForDedupe,
  resolveEbaySoldSearchKeywordForDisplay,
} from "@/lib/search/sold-search-query";

describe("buildBroadRawEbaySoldSearchKeyword", () => {
  it("adds slab exclusions without condition tokens", () => {
    const q = buildBroadRawEbaySoldSearchKeyword({
      name: "Snorlax",
      setName: "151",
      cardNumber: "143",
    });
    expect(q).toContain("Snorlax");
    expect(q).toContain("151");
    expect(q).toContain("#143");
    expect(q).toContain("-PSA");
    expect(q).not.toMatch(/near\s*mint/i);
  });
});

describe("buildConditionFallbackEbaySoldSearchKeyword", () => {
  it("returns null for PSA buckets", () => {
    expect(
      buildConditionFallbackEbaySoldSearchKeyword({
        name: "X",
        setName: null,
        cardNumber: null,
        conditionBucket: "psa_10",
      }),
    ).toBeNull();
  });

  it("appends quoted near mint hints for raw_nm", () => {
    const q = buildConditionFallbackEbaySoldSearchKeyword({
      name: "Pikachu",
      setName: "Base",
      cardNumber: "25",
      conditionBucket: "raw_nm",
    })!;
    expect(q).toContain('"near mint"');
    expect(q).toContain(" NM");
    expect(q).toContain("-PSA");
  });

  it("returns null for raw_mp_hp (uses sequential keyword helper instead)", () => {
    expect(
      buildConditionFallbackEbaySoldSearchKeyword({
        name: "X",
        setName: null,
        cardNumber: "1",
        conditionBucket: "raw_mp_hp",
      }),
    ).toBeNull();
  });
});

describe("buildRawMpHpFallbackEbaySearchKeywords", () => {
  it("returns three distinct queries with slab exclusions on each", () => {
    const qs = buildRawMpHpFallbackEbaySearchKeywords({
      name: "Eevee",
      setName: "SV",
      cardNumber: "12",
    });
    expect(qs).toHaveLength(3);
    expect(qs[0]).toContain('"moderately played"');
    expect(qs[0]).toContain(" MP");
    expect(qs[1]).toContain('"heavily played"');
    expect(qs[1]).toContain(" HP");
    expect(qs[2]).toMatch(/damaged/i);
    expect(qs[2]).toContain("DMG");
    for (const q of qs) {
      expect(q).toContain("-PSA");
      expect(q).toContain("Eevee");
    }
  });
});

describe("buildSoldConditionFallbackRawCacheKey", () => {
  it("suffixes mp/hp variant index", () => {
    expect(buildSoldConditionFallbackRawCacheKey("k", "raw_lp")).toBe("k__cond_fallback_raw_lp");
    expect(buildSoldConditionFallbackRawCacheKey("k", "raw_mp_hp", 1)).toBe("k__cond_fallback_raw_mp_hp_1");
  });
});

describe("buildEbaySoldSearchKeyword", () => {
  it("combines name, set, number, and PSA grade", () => {
    const q = buildEbaySoldSearchKeyword({
      name: "Charizard",
      setName: "Base Set",
      cardNumber: "4",
      conditionBucket: "psa_10",
    });
    expect(q).toContain("Charizard");
    expect(q).toContain("Base Set");
    expect(q).toContain("#4");
    expect(q.toLowerCase()).toContain("psa");
  });

  it("normalizes extra whitespace", () => {
    const q = buildEbaySoldSearchKeyword({
      name: "  Pikachu  ",
      setName: null,
      cardNumber: null,
      conditionBucket: "raw_nm",
    });
    expect(q.startsWith("Pikachu")).toBe(true);
    expect(q).toContain("-PSA");
    expect(q).toContain("-TAG");
  });
});

describe("resolveEbaySoldSearchKeywordForDisplay", () => {
  it("ignores stored raw keyword so exclusions stay current", () => {
    const q = resolveEbaySoldSearchKeywordForDisplay({
      storedKeyword: "Charmander Detective Pikachu #4 -PSA -BGS -CGC -SGC -graded",
      name: "Charmander",
      setName: "Detective Pikachu",
      cardNumber: "4",
      conditionBucket: "raw_nm",
    });
    expect(q).toContain("-TAG");
    expect(q).toContain("Charmander");
  });

  it("uses stored keyword for PSA when present", () => {
    const stored = "Charizard PSA 10";
    expect(
      resolveEbaySoldSearchKeywordForDisplay({
        storedKeyword: stored,
        name: "Charizard",
        setName: null,
        cardNumber: null,
        conditionBucket: "psa_10",
      }),
    ).toBe(stored);
  });
});

describe("buildEbaySoldListingsSearchUrl", () => {
  it("builds sold search URL with encoded keyword", () => {
    const u = buildEbaySoldListingsSearchUrl("Umbreon ex #161");
    expect(u).toContain("https://www.ebay.com/sch/i.html?");
    expect(u).toContain("_nkw=");
    expect(u).toContain(encodeURIComponent("Umbreon ex #161"));
    expect(u).toContain("LH_Sold=1");
    expect(u).toContain("LH_Complete=1");
  });
});

describe("normalizeSoldSearchKeywordForDedupe", () => {
  it("maps equivalent spacing and case to the same string", () => {
    const a = normalizeSoldSearchKeywordForDedupe("Charizard  Base   #4");
    const b = normalizeSoldSearchKeywordForDedupe("charizard base #4");
    expect(a).toBe(b);
  });
});
