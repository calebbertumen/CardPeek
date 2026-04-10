import { beforeEach, describe, expect, it, vi } from "vitest";

const executeRawMock = vi.fn();
const findUniqueMock = vi.fn();
const transactionMock = vi.fn();
const scrapeJobFindFirstMock = vi.fn();
const scrapeJobCreateMock = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    $executeRaw: (...args: unknown[]) => executeRawMock(...args),
    user: {
      findUnique: (...args: unknown[]) => findUniqueMock(...args),
    },
    $transaction: (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        $executeRaw: (...args: unknown[]) => executeRawMock(...args),
        scrapeJob: {
          findFirst: (...args: unknown[]) => scrapeJobFindFirstMock(...args),
          create: (...args: unknown[]) => scrapeJobCreateMock(...args),
        },
      };
      transactionMock();
      return fn(tx);
    },
  },
}));

describe("fresh-scrape-usage.service", () => {
  beforeEach(() => {
    executeRawMock.mockReset();
    findUniqueMock.mockReset();
    scrapeJobFindFirstMock.mockReset();
    scrapeJobCreateMock.mockReset();
    transactionMock.mockReset();
  });

  it("allows Collector unconditionally", async () => {
    const { getFreshScrapeEntitlementForUser } = await import("./fresh-scrape-usage.service");
    const out = await getFreshScrapeEntitlementForUser({ tier: "collector", userId: "u1" });
    expect(out.allowed).toBe(true);
    expect(out.remaining).toBeNull();
  });

  it("blocks Starter when used+reserved hits limit", async () => {
    findUniqueMock.mockResolvedValueOnce({
      collectorTierActive: false,
      freeLifetimeUpdatedLookupsLimit: 3,
      freeLifetimeUpdatedLookupsUsed: 2,
      freeLifetimeUpdatedLookupsReserved: 1,
    });
    const { getFreshScrapeEntitlementForUser } = await import("./fresh-scrape-usage.service");
    const out = await getFreshScrapeEntitlementForUser({ tier: "starter", userId: "u1" });
    expect(out.allowed).toBe(false);
    expect(out.remaining).toBe(0);
    expect(out.reason).toBe("limit_reached");
  });

  it("queueStarterFreshScrapeIfAllowed reserves + creates job", async () => {
    scrapeJobFindFirstMock.mockResolvedValueOnce(null);
    executeRawMock.mockResolvedValueOnce(undefined); // advisory lock
    executeRawMock.mockResolvedValueOnce(1); // reserve update affected rows
    scrapeJobCreateMock.mockResolvedValueOnce({ id: "job1" });

    const { queueStarterFreshScrapeIfAllowed } = await import("./fresh-scrape-usage.service");
    const out = await queueStarterFreshScrapeIfAllowed({
      userId: "u1",
      cardId: "c1",
      conditionBucket: "raw_nm",
      cacheKey: "k1",
      priority: 200,
    });

    expect(transactionMock).toHaveBeenCalled();
    expect(out).toEqual({ kind: "queued", jobId: "job1", didReserve: true });
    expect(scrapeJobCreateMock).toHaveBeenCalledTimes(1);
  });

  it("queueStarterFreshScrapeIfAllowed returns not_allowed when reserve fails", async () => {
    scrapeJobFindFirstMock.mockResolvedValueOnce(null);
    executeRawMock.mockResolvedValueOnce(undefined); // advisory lock
    executeRawMock.mockResolvedValueOnce(0); // reserve fails

    const { queueStarterFreshScrapeIfAllowed } = await import("./fresh-scrape-usage.service");
    const out = await queueStarterFreshScrapeIfAllowed({
      userId: "u1",
      cardId: "c1",
      conditionBucket: "raw_nm",
      cacheKey: "k1",
      priority: 200,
    });
    expect(out).toEqual({ kind: "not_allowed" });
    expect(scrapeJobCreateMock).not.toHaveBeenCalled();
  });
});

