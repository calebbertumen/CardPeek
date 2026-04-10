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

/**
 * Keeps the URL aligned with the last submitted search so `/search` RSC `searchParams` and `experienceKey`
 * match the form (fixes typo-corrected queries without a full navigation).
 */
export function buildSearchQueryStringFromFields(fields: {
  name: string;
  setName?: string | null;
  cardNumber?: string | null;
  condition?: string | null;
}): string {
  const name = fields.name.trim();
  if (!name) return "";
  const params = new URLSearchParams();
  params.set("name", name);
  const setName = (fields.setName ?? "").trim();
  if (setName) params.set("setName", setName);
  const cardNumber = (fields.cardNumber ?? "").trim();
  if (cardNumber) params.set("cardNumber", cardNumber);
  const condition = normalizeConditionBucket((fields.condition ?? "raw_nm").trim() || "raw_nm");
  if (condition && condition !== "raw_nm") params.set("condition", condition);
  return params.toString();
}
