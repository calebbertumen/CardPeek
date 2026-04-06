import type { ConditionBucket } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { ensureCardVariantForCard } from "@/services/card-normalization.service";

const DEFAULT_CONDITION: ConditionBucket = "raw_nm";

/**
 * Collector: save target price on the watchlist row so scheduled active-listing checks + alert history apply.
 * Aligns with “matching listing below your target” (not sold-average-only).
 */
export async function upsertWatchlistDealTarget(input: {
  userId: string;
  cardId: string;
  targetPrice: number;
  watchlistLimit: number;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!Number.isFinite(input.targetPrice) || input.targetPrice <= 0) {
    return { ok: false, message: "Enter a valid target price." };
  }

  const card = await prisma.card.findUnique({
    where: { id: input.cardId },
    select: {
      id: true,
      name: true,
      setName: true,
      cardNumber: true,
      normalizedCardKey: true,
    },
  });
  if (!card) return { ok: false, message: "Card not found." };

  const variant = await ensureCardVariantForCard({
    card,
    conditionBucket: DEFAULT_CONDITION,
  });

  const existing = await prisma.watchlistItem.findUnique({
    where: {
      userId_cardId_conditionBucket: {
        userId: input.userId,
        cardId: input.cardId,
        conditionBucket: DEFAULT_CONDITION,
      },
    },
  });

  const total = await prisma.watchlistItem.count({ where: { userId: input.userId } });
  if (!existing && total >= input.watchlistLimit) {
    return { ok: false, message: `You can track up to ${input.watchlistLimit} cards.` };
  }

  const price = new Prisma.Decimal(input.targetPrice.toFixed(2));

  await prisma.watchlistItem.upsert({
    where: {
      userId_cardId_conditionBucket: {
        userId: input.userId,
        cardId: input.cardId,
        conditionBucket: DEFAULT_CONDITION,
      },
    },
    create: {
      userId: input.userId,
      cardId: input.cardId,
      conditionBucket: DEFAULT_CONDITION,
      cardVariantId: variant.id,
      targetPrice: price,
      alertEnabled: true,
      nextActiveCheckAfter: null,
    },
    update: {
      cardVariantId: variant.id,
      targetPrice: price,
      alertEnabled: true,
    },
  });

  return { ok: true };
}
