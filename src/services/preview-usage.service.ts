import { prisma } from "@/lib/db";

export async function enforceAndRecordPreviewSearch(input: {
  anonymousId: string;
  limitTotal: number;
}): Promise<{ ok: true; remaining: number } | { ok: false; remaining: 0 }> {
  const row = await prisma.previewUsage.upsert({
    where: { anonymousId: input.anonymousId },
    create: { anonymousId: input.anonymousId, searches: 1 },
    update: { searches: { increment: 1 } },
    select: { searches: true },
  });

  const remaining = Math.max(0, input.limitTotal - row.searches);
  if (row.searches > input.limitTotal) return { ok: false, remaining: 0 };
  return { ok: true, remaining };
}

