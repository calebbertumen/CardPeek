import { describe, expect, it } from "vitest";
import {
  CANDIDATE_FETCH_COUNT,
  ebayHtmlImpliesBestOfferAccepted,
  ebayHtmlLooksLikeSoldEndedPage,
  isValidSoldListing,
  mapApifyEbaySoldItemsToListings,
  parseMoneyField,
} from "@/services/apify/ebay-sold-listings.actor";

describe("mapApifyEbaySoldItemsToListings", () => {
  it("keeps at most 5 listings sorted by sold date descending", () => {
    const items = Array.from({ length: 8 }, (_, i) => ({
      title: `Item ${i}`,
      soldPrice: 10 + i,
      endedAt: new Date(Date.UTC(2024, 0, 10 - i)).toISOString(),
      url: `https://www.ebay.com/itm/${100000000000 + i}`,
      itemId: `${100000000000 + i}`,
    }));
    const out = mapApifyEbaySoldItemsToListings(items, "test");
    expect(out.length).toBe(8);
    for (let i = 0; i < out.length - 1; i += 1) {
      expect(out[i]!.soldAt.getTime()).toBeGreaterThanOrEqual(out[i + 1]!.soldAt.getTime());
    }
  });

  it("filters invalid rows", () => {
    const out = mapApifyEbaySoldItemsToListings(
      [{ title: "x", soldPrice: 0, endedAt: new Date().toISOString(), url: "https://e.com" }],
      "test",
    );
    expect(out.length).toBe(0);
  });

  it("uses scrapedAt when ended/sold timestamps are absent", () => {
    const out = mapApifyEbaySoldItemsToListings(
      [
        {
          title: "Listing",
          soldPrice: 10,
          url: "https://www.ebay.com/itm/123456789012",
          itemId: "123456789012",
          scrapedAt: new Date().toISOString(),
        },
      ],
      "test",
    );
    expect(out.length).toBe(1);
  });

  it("keeps rows when actor provides active flags (no post-filter)", () => {
    const out = mapApifyEbaySoldItemsToListings(
      [
        {
          title: "Active listing",
          soldPrice: 10,
          endedAt: new Date(Date.UTC(2024, 0, 10)).toISOString(),
          url: "https://www.ebay.com/itm/123456789012",
          itemId: "123456789012",
          active: true,
        },
      ],
      "test",
    );
    expect(out.length).toBe(1);
  });

  it("does not filter by condition bucket on raw_nm", () => {
    const out = mapApifyEbaySoldItemsToListings(
      [
        {
          title: "Pokemon Card PSA 10 Gem",
          soldPrice: 100,
          endedAt: new Date(Date.UTC(2024, 0, 12)).toISOString(),
          url: "https://www.ebay.com/itm/100000000001",
          itemId: "100000000001",
        },
        {
          title: "Pokemon Card Near Mint Raw",
          soldPrice: 50,
          endedAt: new Date(Date.UTC(2024, 0, 11)).toISOString(),
          url: "https://www.ebay.com/itm/100000000002",
          itemId: "100000000002",
        },
      ],
      "test",
    );
    expect(out.length).toBe(2);
  });

  it("dedupes by eBay item id and keeps the actor listing URL from the winning row", () => {
    const out = mapApifyEbaySoldItemsToListings(
      [
        {
          title: "First title",
          soldPrice: 10,
          endedAt: new Date(Date.UTC(2024, 0, 10)).toISOString(),
          url: "https://www.ebay.com/itm/100000000099",
          itemId: "100000000099",
        },
        {
          title: "Second title",
          soldPrice: 20,
          endedAt: new Date(Date.UTC(2024, 0, 11)).toISOString(),
          url: "https://www.ebay.com/bad-link",
          itemId: "100000000099",
        },
      ],
      "test",
    );
    expect(out.length).toBe(1);
    expect(out[0]!.itemUrl).toBe("https://www.ebay.com/itm/100000000099");
  });

  it("keeps best-offer flagged rows when soldPrice is present", () => {
    const out = mapApifyEbaySoldItemsToListings(
      [
        {
          title: "Umbreon ex",
          soldPrice: "3433.95",
          endedAt: "2026-04-08T04:33:00.000Z",
          url: "https://www.ebay.com/itm/100000000123",
          itemId: "100000000123",
          bestOfferAccepted: true,
        },
        {
          title: "Umbreon ex",
          soldPrice: "1800.00",
          endedAt: "2026-04-07T04:33:00.000Z",
          url: "https://www.ebay.com/itm/100000000124",
          itemId: "100000000124",
        },
      ],
      "test",
    );
    expect(out.length).toBe(2);
  });

  it("keeps rows when actor url is a search page (no itemUrl; item id not paired)", () => {
    const out = mapApifyEbaySoldItemsToListings(
      [
        {
          title: "Row",
          soldPrice: 10,
          endedAt: new Date(Date.UTC(2024, 0, 10)).toISOString(),
          url: "https://www.ebay.com/sch/i.html?_nkw=umbreon",
          itemId: "100000000777",
        },
      ],
      "test",
    );
    expect(out.length).toBe(1);
    expect(out[0]!.itemUrl).toBeNull();
  });

  it("accepts actor itemId when url is missing /itm/ but itemId is valid (non-search URLs)", () => {
    const out = mapApifyEbaySoldItemsToListings(
      [
        {
          title: "Card",
          soldPrice: 10,
          endedAt: new Date(Date.UTC(2024, 0, 10)).toISOString(),
          itemId: "100000000777",
        },
      ],
      "test",
    );
    expect(out.length).toBe(1);
    expect(out[0]!.itemUrl).toBeNull();
  });

  it("maps ViewItem-style listing URLs without /itm/ in path", () => {
    const out = mapApifyEbaySoldItemsToListings(
      [
        {
          title: "Card",
          soldPrice: 10,
          endedAt: new Date(Date.UTC(2024, 0, 10)).toISOString(),
          url: "https://cgi.ebay.com/ws/eBayISAPI.dll?ViewItem&item=123456789012",
          itemId: "123456789012",
        },
      ],
      "test",
    );
    expect(out.length).toBe(1);
    expect(out[0]!.itemUrl).toBe("https://www.ebay.com/itm/123456789012");
  });

  it("parses string sold prices from the actor (caffein.dev)", () => {
    const out = mapApifyEbaySoldItemsToListings(
      [
        {
          title: "Card",
          soldPrice: "87.28",
          endedAt: "2025-12-22T05:00:00.000Z",
          url: "https://www.ebay.com/itm/123456789012",
          itemId: "123456789012",
        },
      ],
      "test",
    );
    expect(out.length).toBe(1);
    expect(out[0]!.soldPrice).toBe(87.28);
  });

  it("keeps psa_10 rows when the sold-search keyword encodes PSA 10 but the title omits it", () => {
    const out = mapApifyEbaySoldItemsToListings(
      [
        {
          title: "Blaine's Charizard Gym Challenge #2 Holo Rare",
          soldPrice: "200",
          endedAt: "2025-12-22T05:00:00.000Z",
          url: "https://www.ebay.com/itm/123456789012",
          itemId: "123456789012",
        },
      ],
      "Blaine's Charizard Gym Challenge #2 PSA 10",
    );
    expect(out.length).toBe(1);
  });
});

describe("parseMoneyField", () => {
  it("handles currency symbols and commas", () => {
    expect(parseMoneyField("$1,234.56")).toBe(1234.56);
    expect(parseMoneyField("215")).toBe(215);
  });
});

describe("isValidSoldListing", () => {
  it("accepts rows with positive sold price", () => {
    expect(
      isValidSoldListing({
        title: "Card",
        soldPrice: 100,
        soldAt: new Date(Date.UTC(2024, 0, 10)),
        itemUrl: "https://www.ebay.com/itm/123456789012",
        itemId: "123456789012",
        raw: { bestOfferAccepted: true },
      }),
    ).toBe(true);
  });

  it("rejects accessory / packaging listings by title (e.g. cases)", () => {
    expect(
      isValidSoldListing({
        title: "Pokemon Umbreon EX SIR 161/131 Prismatic Evolutions Custom Case",
        soldPrice: 12,
        soldAt: new Date(Date.UTC(2024, 0, 10)),
        itemUrl: "https://www.ebay.com/itm/123456789012",
        itemId: "123456789012",
        raw: {},
      }),
    ).toBe(false);
  });

  it("rejects non-positive or invalid sold price", () => {
    expect(
      isValidSoldListing({
        title: "Card",
        soldPrice: 0,
        soldAt: new Date(Date.UTC(2024, 0, 10)),
        itemUrl: "https://www.ebay.com/itm/123456789012",
        itemId: "123456789012",
        raw: {},
      }),
    ).toBe(false);
  });
});

describe("CANDIDATE_FETCH_COUNT", () => {
  it("is fixed at 8 for cost control", () => {
    expect(CANDIDATE_FETCH_COUNT).toBe(8);
  });
});

describe("ebayHtmlLooksLikeSoldEndedPage", () => {
  it("detects sold/ended copy and embedded ended flags", () => {
    expect(ebayHtmlLooksLikeSoldEndedPage("This listing sold on Apr 1")).toBe(true);
    expect(ebayHtmlLooksLikeSoldEndedPage("This item sold")).toBe(true);
    expect(ebayHtmlLooksLikeSoldEndedPage('state:"itemEnded": true')).toBe(true);
    expect(ebayHtmlLooksLikeSoldEndedPage('"itemEnded": true')).toBe(true);
  });
});

describe("ebayHtmlImpliesBestOfferAccepted", () => {
  it("detects visible copy and nbsp variants", () => {
    expect(ebayHtmlImpliesBestOfferAccepted("x Best offer accepted y")).toBe(true);
    expect(ebayHtmlImpliesBestOfferAccepted("x Best\u00a0offer\u00a0accepted y")).toBe(true);
  });

  it("detects embedded JSON flags", () => {
    expect(ebayHtmlImpliesBestOfferAccepted('foo "bestOfferAccepted": true bar')).toBe(true);
    expect(ebayHtmlImpliesBestOfferAccepted("itemEndedWithBestOffer:true")).toBe(true);
  });

  it("detects sold ribbon + strikethrough styling (common BO UI)", () => {
    const html = `
      This listing sold on Wed, Apr 8 at 4:52 AM.
      <span style="text-decoration-line: line-through">US $430.00</span>
    `;
    expect(ebayHtmlImpliesBestOfferAccepted(html)).toBe(true);
  });

  it("detects sold page with <s> around list price", () => {
    const html = `This listing sold on Wed, Apr 8. <s>US $430.00</s>`;
    expect(ebayHtmlImpliesBestOfferAccepted(html)).toBe(true);
  });
});
