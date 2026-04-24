export type SoldSampleStrength = "strong" | "moderate" | "limited";

export function soldSampleStrengthFromUsableCount(usableCompCount: number): SoldSampleStrength {
  if (usableCompCount >= 5) return "strong";
  if (usableCompCount >= 3) return "moderate";
  return "limited";
}

export function soldSampleStrengthLabel(strength: SoldSampleStrength): string {
  if (strength === "strong") return "Strong sample";
  if (strength === "moderate") return "Moderate sample";
  return "Limited sample";
}
