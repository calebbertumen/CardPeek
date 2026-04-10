import type { CachePolicyResult } from "@/lib/cache/card-cache-policy";

export type CachePolicyLogPayload = {
  normalizedCardKey: string;
  temperature: CachePolicyResult["temperature"];
  ttlHours: number;
  reasons: string[];
  cacheStatus: "hit" | "stale" | "miss";
  refreshTriggered?: boolean;
};

/**
 * Structured log for tuning adaptive TTL (dev: prefixed; prod: JSON line).
 */
export function logCachePolicyDecision(payload: CachePolicyLogPayload): void {
  const line = JSON.stringify({
    event: "cache_policy",
    ...payload,
    ts: new Date().toISOString(),
  });
  if (process.env.NODE_ENV === "development") {
    // eslint-disable-next-line no-console
    console.log("[cache-policy]", line);
  } else {
    // eslint-disable-next-line no-console
    console.log(line);
  }
}
