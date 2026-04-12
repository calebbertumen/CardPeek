import { describe, expect, it } from "vitest";
import { ebaySoldSearchHtmlIndicatesNoExactMatches } from "@/lib/search/ebay-sold-search-exact-match";

describe("ebaySoldSearchHtmlIndicatesNoExactMatches", () => {
  it("returns false for short or empty HTML", () => {
    expect(ebaySoldSearchHtmlIndicatesNoExactMatches("")).toBe(false);
    expect(ebaySoldSearchHtmlIndicatesNoExactMatches("x".repeat(300))).toBe(false);
  });

  it("detects Results matching fewer words", () => {
    const html = `${"x".repeat(500)}Results matching fewer words${"y".repeat(100)}`;
    expect(ebaySoldSearchHtmlIndicatesNoExactMatches(html)).toBe(true);
  });

  it("detects No exact matches found", () => {
    const html = `${"x".repeat(500)}No exact matches found${"y".repeat(100)}`;
    expect(ebaySoldSearchHtmlIndicatesNoExactMatches(html)).toBe(true);
  });

  it("returns false for unrelated long HTML", () => {
    const html = `${"x".repeat(500)}sold listings pokemon psa 10${"y".repeat(200)}`;
    expect(ebaySoldSearchHtmlIndicatesNoExactMatches(html)).toBe(false);
  });
});
