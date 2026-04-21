import type { SoldCompListingDTO, SoldCompsFetchInput, SoldCompsProvider } from "./types";
import { getSoldComps } from "@/lib/services/soldCompsProvider";

/**
 * Mock sold comps  -  UI and cache consume normalized DTOs only.
 * Raw mock payload is built in @/lib/mock; swap getSoldComps for a scraper-backed implementation later.
 */
export class MockSoldCompsProvider implements SoldCompsProvider {
  async fetchRecentSold(input: SoldCompsFetchInput): Promise<SoldCompListingDTO[]> {
    const mock = await getSoldComps(input.cardName, input.conditionBucket);
    return mock.listings.map((l) => ({
      title: l.title,
      source: "mock",
      soldPrice: l.soldPrice,
      soldDate: new Date(l.soldDate),
      listingUrl: "",
      conditionLabel: l.conditionLabel,
    }));
  }
}

export const mockSoldCompsProvider = new MockSoldCompsProvider();
