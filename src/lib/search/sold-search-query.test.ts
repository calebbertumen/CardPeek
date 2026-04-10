import { describe, expect, it } from "vitest";
import {
  buildEbaySoldListingsSearchUrl,
  buildEbaySoldSearchKeyword,
  normalizeSoldSearchKeywordForDedupe,
} from "@/lib/search/sold-search-query";

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
