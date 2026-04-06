import type { ConditionBucket } from "@prisma/client";
import { prisma } from "@/lib/db";
import { notifyUser } from "@/services/notifications/notify";
import { Prisma } from "@prisma/client";

export async function evaluatePriceAlertsForCard(input: {
  cardId: string;
  conditionBucket: ConditionBucket;
  newAvgPrice: number;
}): Promise<void> {
  const alerts = await prisma.priceAlert.findMany({
    where: {
      cardId: input.cardId,
      isActive: true,
      OR: [{ conditionBucket: null }, { conditionBucket: input.conditionBucket }],
    },
    select: { id: true, userId: true, targetPrice: true, lastTriggeredAt: true },
  });

  const now = new Date();
  for (const a of alerts) {
    const target = Number(a.targetPrice);
    if (!Number.isFinite(target)) continue;
    if (input.newAvgPrice <= target) {
      await prisma.priceAlert.update({
        where: { id: a.id },
        data: { lastTriggeredAt: now, isActive: false },
      });
      await notifyUser({
        userId: a.userId,
        type: "price_alert_triggered",
        payload: {
          cardId: input.cardId,
          conditionBucket: input.conditionBucket,
          triggeredAt: now.toISOString(),
          avgPrice: input.newAvgPrice,
          targetPrice: target,
          note:
            "Triggered when new market data was processed. Data is updated periodically and may not reflect real-time listings.",
        },
      });
    }
  }
}

export async function createPriceAlert(input: {
  userId: string;
  cardId: string;
  conditionBucket?: ConditionBucket | null;
  targetPrice: number;
  maxActiveAlerts: number;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const activeCount = await prisma.priceAlert.count({
    where: { userId: input.userId, isActive: true },
  });
  if (activeCount >= input.maxActiveAlerts) {
    return { ok: false, message: `You can have up to ${input.maxActiveAlerts} active alerts.` };
  }

  if (!Number.isFinite(input.targetPrice) || input.targetPrice <= 0) {
    return { ok: false, message: "Enter a valid target price." };
  }

  await prisma.priceAlert.create({
    data: {
      userId: input.userId,
      cardId: input.cardId,
      conditionBucket: input.conditionBucket ?? null,
      targetType: "below_price",
      targetPrice: new Prisma.Decimal(input.targetPrice.toFixed(2)),
      isActive: true,
    },
  });

  return { ok: true };
}

