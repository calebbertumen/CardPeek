import { describe, expect, it } from "vitest";
import { buildScrapedCardSnapshotFromSoldListings } from "@/lib/pricing/sold-comp-selection";
import type { ScrapedSoldListing, SoldCompCardContext } from "@/lib/scraping/types";

const d = (day: number) => new Date(Date.UTC(2025, 0, day, 12, 0, 0));

describe("buildScrapedCardSnapshotFromSoldListings", () => {
  it("returns median headline and prefers on-card comps over junk lots", () => {
    const ctx: SoldCompCardContext = {
      name: "Snorlax",
      setName: "151",
      cardNumber: "143",
      conditionBucket: "raw_nm",
    };
    const listings: ScrapedSoldListing[] = [
      { title: "Pokemon lot x10 mixed", soldPrice: 5, soldAt: d(30), itemId: "1" },
      { title: "Snorlax 151 #143 Near Mint NM", soldPrice: 120, soldAt: d(5), itemId: "2" },
      { title: "Snorlax 151 #143 NM clean", soldPrice: 118, soldAt: d(4), itemId: "3" },
      { title: "Snorlax 151 #143", soldPrice: 122, soldAt: d(3), itemId: "4" },
    ];
    const snap = buildScrapedCardSnapshotFromSoldListings({
      normalizedCardIdentifier: "k",
      displayName: "kw",
      listings,
      context: ctx,
    });
    expect(snap.soldListings.length).toBeGreaterThanOrEqual(1);
    expect(snap.soldListings.every((l) => !/lot\s*x10/i.test(l.title))).toBe(true);
    expect(snap.averagePrice).toBe(snap.medianPrice);
    expect(snap.averagePrice).toBeGreaterThan(50);
  });
});
