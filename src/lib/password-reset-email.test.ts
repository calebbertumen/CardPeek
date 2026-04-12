import { describe, expect, it } from "vitest";
import { normalizeResendFromAddress } from "@/lib/password-reset-email";

describe("normalizeResendFromAddress", () => {
  it("strips wrapping quotes", () => {
    expect(normalizeResendFromAddress('"CardPeek <hi@x.com>"')).toBe("CardPeek <hi@x.com>");
  });

  it("inserts space before angle bracket when missing", () => {
    expect(normalizeResendFromAddress("CardPeek<hi@x.com>")).toBe("CardPeek <hi@x.com>");
  });
});
