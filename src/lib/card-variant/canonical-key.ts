import type { ConditionBucket } from "@prisma/client";

export type CardVariantParts = {
  /** Stable catalog id from our `Card.normalizedCardKey` (avoids ambiguous name/set collisions). */
  catalogKey: string;
  name: string;
  setName?: string | null;
  cardNumber?: string | null;
  /** Sub-variant (e.g. holo) — optional */
  variantLabel?: string | null;
  gradingCompany?: string | null;
  gradeLabel?: string | null;
  conditionBucket: ConditionBucket;
};

/**
 * Stable canonical key for ONE card variant (scrape + dedupe unit).
 * Cost rule: one key → one shared scrape result for all users.
 */
export function buildCanonicalCardKey(parts: CardVariantParts): string {
  const slug = (s: string) =>
    s
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ")
      .replace(/[^a-z0-9\s#/\-_.]/gi, "");

  const catalog = slug(parts.catalogKey);
  const name = slug(parts.name);
  const set = parts.setName ? slug(parts.setName) : "";
  const num = parts.cardNumber ? slug(parts.cardNumber) : "";
  const variant = parts.variantLabel ? slug(parts.variantLabel) : "";
  const gradeCo = parts.gradingCompany ? slug(parts.gradingCompany) : "";
  const grade = parts.gradeLabel ? slug(parts.gradeLabel) : "";
  const cond = parts.conditionBucket;

  return [catalog, name, set, num, variant, gradeCo, grade, cond].filter(Boolean).join("|");
}
