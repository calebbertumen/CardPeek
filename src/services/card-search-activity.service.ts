import { prisma } from "@/lib/db";
import type { CardSearchStats } from "@/lib/cache/card-cache-policy";

const MS_24H = 24 * 60 * 60 * 1000;
const MS_7D = 7 * MS_24H;
const MS_30D = 30 * MS_24H;

/**
 * Snapshot of search activity for a normalized card key (before the current search is recorded).
 */
export async function getCardSearchStats(normalizedCardKey: string): Promise<CardSearchStats> {
  const now = Date.now();
  const since24h = new Date(now - MS_24H);
  const since7d = new Date(now - MS_7D);
  const since30d = new Date(now - MS_30D);

  const base = { normalizedCardKey };

  const [searchCount24h, searchCount7d, searchCount30d, lastRow, uniqueUsersGroup] = await Promise.all([
    prisma.cardSearchEvent.count({
      where: { ...base, searchedAt: { gte: since24h } },
    }),
    prisma.cardSearchEvent.count({
      where: { ...base, searchedAt: { gte: since7d } },
    }),
    prisma.cardSearchEvent.count({
      where: { ...base, searchedAt: { gte: since30d } },
    }),
    prisma.cardSearchEvent.findFirst({
      where: base,
      orderBy: { searchedAt: "desc" },
      select: { searchedAt: true },
    }),
    prisma.cardSearchEvent.groupBy({
      by: ["userId"],
      where: {
        ...base,
        searchedAt: { gte: since7d },
        userId: { not: null },
      },
    }),
  ]);

  return {
    lastSearchedAt: lastRow?.searchedAt ?? null,
    searchCount24h,
    searchCount7d,
    searchCount30d,
    uniqueUsers7d: uniqueUsersGroup.length,
  };
}

export async function recordCardSearchEvent(
  normalizedCardKey: string,
  userId: string | null | undefined,
): Promise<void> {
  await prisma.cardSearchEvent.create({
    data: {
      normalizedCardKey,
      userId: userId ?? null,
    },
  });
}
