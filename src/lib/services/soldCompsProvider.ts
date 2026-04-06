import { generateMockComps } from "@/lib/mock/generateMockComps";
import type { MockComps } from "@/lib/mock/generateMockComps";

// TODO: Replace with real eBay scraping provider (e.g. Apify) later

export async function getSoldComps(cardName: string, condition: string): Promise<MockComps> {
  return generateMockComps(cardName, condition);
}
