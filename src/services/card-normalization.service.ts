import type { Card, ConditionBucket } from "@prisma/client";
import { prisma } from "@/lib/db";
import { buildCanonicalCardKey } from "@/lib/card-variant/canonical-key";

/**
 * Ensures a {@link CardVariant} exists for catalog {@link Card} + condition bucket.
 * Maps TCG card + bucket → canonical scrape identity (shared across users).
 */
export async function ensureCardVariantForCard(input: {
  card: Pick<Card, "id" | "name" | "setName" | "cardNumber" | "normalizedCardKey">;
  conditionBucket: ConditionBucket;
}): Promise<{ id: string; canonicalKey: string }> {
  const canonicalKey = buildCanonicalCardKey({
    catalogKey: input.card.normalizedCardKey,
    name: input.card.name,
    setName: input.card.setName,
    cardNumber: input.card.cardNumber,
    variantLabel: null,
    gradingCompany: null,
    gradeLabel: null,
    conditionBucket: input.conditionBucket,
  });

  const displayName = [input.card.name, input.card.setName].filter(Boolean).join(" · ");

  const row = await prisma.cardVariant.upsert({
    where: { canonicalKey },
    create: {
      canonicalKey,
      displayName,
      setName: input.card.setName,
      cardNumber: input.card.cardNumber,
      variantLabel: null,
      gradingCompany: null,
      gradeLabel: null,
      conditionBucket: input.conditionBucket,
      cardId: input.card.id,
    },
    update: {
      displayName,
      setName: input.card.setName,
      cardNumber: input.card.cardNumber,
      cardId: input.card.id,
    },
    select: { id: true, canonicalKey: true },
  });

  return row;
}
