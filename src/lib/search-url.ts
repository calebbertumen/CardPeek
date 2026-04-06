import { normalizeConditionBucket } from "@/lib/normalize";

function pickSearchParam(value: string | string[] | undefined): string | undefined {
  if (value === undefined) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

export type SearchPageFormDefaults = {
  name: string;
  setName: string;
  cardNumber: string;
  condition: string;
};

export function searchDefaultsFromUrlParams(
  searchParams: Record<string, string | string[] | undefined>,
): SearchPageFormDefaults {
  const conditionRaw = pickSearchParam(searchParams.condition)?.trim() || "raw_nm";
  return {
    name: pickSearchParam(searchParams.name)?.trim() ?? "",
    setName: pickSearchParam(searchParams.setName)?.trim() ?? "",
    cardNumber: pickSearchParam(searchParams.cardNumber)?.trim() ?? "",
    condition: normalizeConditionBucket(conditionRaw),
  };
}
