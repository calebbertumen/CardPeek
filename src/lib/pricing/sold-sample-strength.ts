export type SoldSampleStrength = "strong" | "moderate" | "limited" | "none";

export function soldSampleStrengthFromUsableCount(usableCompCount: number): SoldSampleStrength {
  if (usableCompCount >= 5) return "strong";
  if (usableCompCount >= 3) return "moderate";
  if (usableCompCount >= 1) return "limited";
  return "none";
}

export function soldSampleStrengthLabel(strength: SoldSampleStrength): string {
  if (strength === "none") return "No reliable sold listings found.";
  if (strength === "strong") return "Strong sample · Based on 5 selected recent sales.";
  if (strength === "moderate") return "Moderate sample";
  return "Limited sample";
}
