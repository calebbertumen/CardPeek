import { mockSoldCompsProvider } from "./mock-sold-comps.provider";
import type { SoldCompsProvider } from "./types";

/**
 * Swap mockSoldCompsProvider for a production provider without touching UI/cache logic.
 * TODO: export createEbaySoldCompsProvider() or Apify-backed implementation.
 */
export function getSoldCompsProvider(): SoldCompsProvider {
  return mockSoldCompsProvider;
}

export type { SoldCompListingDTO, SoldCompsFetchInput, SoldCompsProvider } from "./types";
