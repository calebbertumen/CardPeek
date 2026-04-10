import { describe, expect, it } from "vitest";
import { isSoldCacheFresh } from "@/lib/sold-cache/cache-fresh";

describe("isSoldCacheFresh", () => {
  it("returns true within TTL", () => {
    const ttlMs = 24 * 60 * 60 * 1000;
    const now = Date.now();
    const scraped = new Date(now - ttlMs + 60_000);
    expect(isSoldCacheFresh(scraped, now, ttlMs)).toBe(true);
  });

  it("returns false when older than TTL", () => {
    const ttlMs = 24 * 60 * 60 * 1000;
    const now = Date.now();
    const scraped = new Date(now - ttlMs - 1);
    expect(isSoldCacheFresh(scraped, now, ttlMs)).toBe(false);
  });
});
