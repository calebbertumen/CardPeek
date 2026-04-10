import { beforeEach, describe, expect, it, vi } from "vitest";

const createMock = vi.fn();
const findUniqueMock = vi.fn();
const deleteManyMock = vi.fn().mockResolvedValue({ count: 0 });
const executeRawMock = vi.fn().mockResolvedValue(undefined);

vi.mock("@/lib/db", () => ({
  prisma: {
    $transaction: (fn: (tx: unknown) => Promise<boolean>) => {
      const tx = {
        $executeRaw: executeRawMock,
        scrapeLock: {
          deleteMany: deleteManyMock,
          findUnique: findUniqueMock,
          create: (...args: unknown[]) => createMock(...args),
        },
      };
      return fn(tx);
    },
  },
}));

describe("tryAcquireScrapeLock", () => {
  beforeEach(() => {
    createMock.mockReset();
    findUniqueMock.mockReset();
    findUniqueMock.mockResolvedValue(null);
    deleteManyMock.mockClear();
    executeRawMock.mockClear();
  });

  it("returns true when lock row is created", async () => {
    createMock.mockResolvedValueOnce({});
    const { tryAcquireScrapeLock } = await import("@/lib/scrape/scrape-lock");
    const ok = await tryAcquireScrapeLock({ scope: "sold", lockKey: "charizard-base" });
    expect(ok).toBe(true);
    expect(createMock).toHaveBeenCalledTimes(1);
    expect(executeRawMock).toHaveBeenCalled();
  });

  it("returns false when a non-expired lock already exists", async () => {
    findUniqueMock.mockResolvedValueOnce({
      id: "x",
      scope: "sold",
      lockKey: "charizard-base",
      expiresAt: new Date(Date.now() + 60_000),
      lockedAt: new Date(),
    });
    const { tryAcquireScrapeLock } = await import("@/lib/scrape/scrape-lock");
    const ok = await tryAcquireScrapeLock({ scope: "sold", lockKey: "charizard-base" });
    expect(ok).toBe(false);
    expect(createMock).not.toHaveBeenCalled();
  });
});
