import { describe, expect, it } from "vitest";
import {
  isLikelyGradedListingTitle,
  listingItemIdFromActorFields,
  normalizeEbayItemId,
  soldListingTitleMatchesBucket,
} from "@/lib/search/ebay-sold-filters";

describe("isLikelyGradedListingTitle", () => {
  it("detects common slab keywords", () => {
    expect(isLikelyGradedListingTitle("Umbreon PSA 10")).toBe(true);
    expect(isLikelyGradedListingTitle("BGS 9.5 Charizard")).toBe(true);
    expect(isLikelyGradedListingTitle("Near Mint English")).toBe(false);
  });
});

describe("soldListingTitleMatchesBucket", () => {
  it("raw_nm rejects PSA listings", () => {
    expect(soldListingTitleMatchesBucket("PSA 10 Gem", "raw_nm")).toBe(false);
    expect(soldListingTitleMatchesBucket("Near Mint NM", "raw_nm")).toBe(true);
  });

  it("psa_9 requires PSA 9 in title", () => {
    expect(soldListingTitleMatchesBucket("PSA 9 Mint", "psa_9")).toBe(true);
    expect(soldListingTitleMatchesBucket("PSA 10 Gem", "psa_9")).toBe(false);
  });

  it("psa_10 can match on condition label even when title omits PSA", () => {
    expect(soldListingTitleMatchesBucket("Blaine's Charizard", "psa_10", "PSA 10")).toBe(true);
  });

  it("psa_10 matches Gem Mint 10 variants", () => {
    expect(soldListingTitleMatchesBucket("Charizard GEM MINT 10", "psa_10")).toBe(true);
    expect(soldListingTitleMatchesBucket("Charizard GEM MT 10", "psa_10")).toBe(true);
  });

  it("psa_10 accepts PSA10 / PSA-10 spellings", () => {
    expect(soldListingTitleMatchesBucket("Charizard PSA10 holo", "psa_10")).toBe(true);
    expect(soldListingTitleMatchesBucket("Charizard PSA-10", "psa_10")).toBe(true);
  });

  it("psa_10 uses search keyword when title omits grade (eBay truncates)", () => {
    const kw = "Blaine's Charizard Gym Challenge #2 PSA 10";
    expect(soldListingTitleMatchesBucket("Blaine's Charizard Gym Challeng…", "psa_10", null, kw)).toBe(true);
  });

  it("psa_10 keyword fallback rejects a different PSA grade in title", () => {
    const kw = "Blaine's Charizard Gym Challenge #2 PSA 10";
    expect(soldListingTitleMatchesBucket("Charizard PSA 9 NM", "psa_10", null, kw)).toBe(false);
  });
});

describe("listingItemIdFromActorFields", () => {
  it("does not pair search URLs with itemId (wrong-link guard)", () => {
    expect(
      listingItemIdFromActorFields("123456789012", "https://www.ebay.com/sch/i.html?_nkw=charizard"),
    ).toBe(null);
  });

  it("uses item id from /itm/ URL when present", () => {
    expect(listingItemIdFromActorFields("999999999999", "https://www.ebay.com/itm/123456789012")).toBe(
      "123456789012",
    );
  });

  it("uses itemId when url is absent", () => {
    expect(listingItemIdFromActorFields("123456789012", null)).toBe("123456789012");
  });
});

describe("normalizeEbayItemId", () => {
  it("prefers long numeric ids", () => {
    expect(normalizeEbayItemId("123456789012", undefined)).toBe("123456789012");
    expect(normalizeEbayItemId(undefined, "https://www.ebay.com/itm/123456789012")).toBe("123456789012");
  });

  it("parses ViewItem-style URLs with item in the query string", () => {
    expect(
      normalizeEbayItemId(undefined, "https://cgi.ebay.com/ws/eBayISAPI.dll?ViewItem&item=123456789012"),
    ).toBe("123456789012");
  });

  it("does not use itemId when the URL is a search page", () => {
    expect(
      normalizeEbayItemId("123456789012", "https://www.ebay.com/sch/i.html?_nkw=pokemon"),
    ).toBeNull();
  });
});
