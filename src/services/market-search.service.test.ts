import { beforeEach, describe, expect, it, vi } from "vitest";

const upsertCardFromApiMock = vi.fn();
const cardCacheFindUniqueMock = vi.fn();
const cardCacheUpdateMock = vi.fn();

vi.mock("@/services/card-cache.service", () => ({
  upsertCardFromApi: (...args: unknown[]) => upsertCardFromApiMock(...args),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    card: { findUnique: vi.fn() },
    cardCache: {
      findUnique: (...args: unknown[]) => cardCacheFindUniqueMock(...args),
      update: (...args: unknown[]) => cardCacheUpdateMock(...args),
    },
  },
}));

const getEntitlementMock = vi.fn();
const queueStarterMock = vi.fn();

vi.mock("@/services/fresh-scrape-usage.service", async () => {
  const actual = await vi.importActual<typeof import("./fresh-scrape-usage.service")>(
    "./fresh-scrape-usage.service",
  );
  return {
    ...actual,
    getFreshScrapeEntitlementForUser: (...args: unknown[]) => getEntitlementMock(...args),
    queueStarterFreshScrapeIfAllowed: (...args: unknown[]) => queueStarterMock(...args),
  };
});

vi.mock("@/services/scrape-queue.service", () => ({
  queueScrapeRefreshIfNeeded: vi.fn(),
}));
vi.mock("@/services/scrape-worker.service", () => ({
  processPendingScrapeJobs: vi.fn(),
}));
vi.mock("@/services/sold-cache-wait.service", () => ({
  waitForFreshSoldCache: vi.fn(),
}));
vi.mock("@/services/apify/scrape-metrics", () => ({
  logSoldScrapeMetric: vi.fn(),
}));
vi.mock("@/lib/cache/cache-policy-log", () => ({
  logCachePolicyDecision: vi.fn(),
}));
vi.mock("@/services/card-search-activity.service", () => ({
  getCardSearchStats: vi.fn().mockResolvedValue({
    lastSearchedAt: null,
    searchCount24h: 0,
    searchCount7d: 0,
    searchCount30d: 0,
    uniqueUsers7d: 0,
  }),
  recordCardSearchEvent: vi.fn(),
}));
vi.mock("@/lib/ebay/enrich-listing-images", () => ({
  enrichSoldListingImages: async (rows: unknown) => rows,
}));

describe("searchCardMarketData (lifetime updated lookups)", () => {
  beforeEach(() => {
    upsertCardFromApiMock.mockReset();
    cardCacheFindUniqueMock.mockReset();
    cardCacheUpdateMock.mockReset();
    getEntitlementMock.mockReset();
    queueStarterMock.mockReset();
  });

  it("Starter cache hit does not queue or reserve", async () => {
    upsertCardFromApiMock.mockResolvedValueOnce({
      id: "card1",
      name: "Pikachu",
      setName: null,
      cardNumber: null,
      imageSmall: "s",
      imageLarge: "l",
      normalizedCardKey: "pikachu",
    });

    cardCacheFindUniqueMock.mockResolvedValueOnce({
      id: "cache1",
      avgPrice: 10,
      medianPrice: 10,
      lowPrice: 10,
      highPrice: 10,
      listingsCount: 1,
      lastScrapedAt: new Date(Date.now() - 60_000),
      lastScrapeError: null,
      ebaySearchKeyword: "pikachu",
      listings: [
        {
          title: "x",
          source: "ebay",
          soldPrice: 10,
          soldDate: new Date(),
          listingUrl: "",
          imageUrl: null,
          conditionLabel: null,
          gradeLabel: null,
          rawOrGraded: null,
          position: 1,
        },
      ],
    });

    getEntitlementMock.mockResolvedValueOnce({
      allowed: true,
      reason: "ok",
      remaining: 3,
      limit: 3,
      used: 0,
    });

    const { searchCardMarketData } = await import("./market-search.service");
    const res = await searchCardMarketData({
      name: "Pikachu",
      requestedConditionBucket: "raw_nm",
      entitlements: {
        tier: "starter",
        searchesPerDay: 1,
        searchesPerDaySoftCap: 1,
        previewSearchesTotalLimit: null,
        recentSalesVisibleCount: 0,
        canTriggerRefresh: false,
        canUseFilters: false,
        canSeeExtendedHistory: false,
        historyPeriodsDays: [],
      },
      userId: "u1",
    });

    expect(res.kind).toBe("ok");
    expect(queueStarterMock).not.toHaveBeenCalled();
  });
});

