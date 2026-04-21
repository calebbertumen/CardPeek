import type { ConditionBucket } from "@prisma/client";

const VALID: ConditionBucket[] = [
  "raw_nm",
  "raw_lp",
  "raw_mp_hp",
  "psa_8",
  "psa_9",
  "psa_10",
];

const ALIAS: Record<string, ConditionBucket> = {
  raw_nm: "raw_nm",
  raw_lp: "raw_lp",
  raw_mp_hp: "raw_mp_hp",
  psa_8: "psa_8",
  psa_9: "psa_9",
  psa_10: "psa_10",
  "raw (nm)": "raw_nm",
  "near mint": "raw_nm",
  nm: "raw_nm",
  "raw (lp)": "raw_lp",
  "lightly played": "raw_lp",
  lp: "raw_lp",
  "raw (mp/hp)": "raw_mp_hp",
  "moderately played": "raw_mp_hp",
  "heavily played": "raw_mp_hp",
  mp: "raw_mp_hp",
  hp: "raw_mp_hp",
  "psa 8": "psa_8",
  "psa 9": "psa_9",
  "psa 10": "psa_10",
};

export function normalizeCardKeyParts(input: {
  name: string;
  setName?: string | null;
  cardNumber?: string | null;
}): string {
  const slug = (s: string) =>
    s
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ")
      .replace(/[^a-z0-9\s#/\-]/gi, "");

  const name = slug(input.name);
  const set = input.setName ? slug(input.setName) : "";
  const num = input.cardNumber ? slug(input.cardNumber) : "";
  return [name, set, num].filter(Boolean).join("|");
}

export function buildCacheKey(normalizedCardKey: string, bucket: ConditionBucket): string {
  return `${normalizedCardKey}__${bucket}`;
}

export function normalizeConditionBucket(raw: string): ConditionBucket {
  const underscored = raw.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (VALID.includes(underscored as ConditionBucket)) {
    return underscored as ConditionBucket;
  }
  const spaced = raw.trim().toLowerCase();
  return ALIAS[spaced] ?? "raw_nm";
}

export const CONDITION_OPTIONS: { value: ConditionBucket; label: string }[] = [
  { value: "raw_nm", label: "Raw (Near Mint)" },
  { value: "raw_lp", label: "Raw (Lightly Played)" },
  { value: "raw_mp_hp", label: "Raw (Moderately / Heavily Played)" },
  { value: "psa_8", label: "PSA 8" },
  { value: "psa_9", label: "PSA 9" },
  { value: "psa_10", label: "PSA 10" },
];
