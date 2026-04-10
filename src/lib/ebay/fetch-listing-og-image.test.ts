import { describe, expect, it } from "vitest";
import { fetchEbayListingOgImageUrl } from "@/lib/ebay/fetch-listing-og-image";

describe("fetchEbayListingOgImageUrl (HTML parse)", () => {
  it("extracts og:image", async () => {
    const html = `<!doctype html><html><head>
<meta property="og:image" content="https://i.ebayimg.com/images/g/xx/s-l500.jpg" />
</head><body></body></html>`;
    const orig = globalThis.fetch;
    globalThis.fetch = async () =>
      ({
        ok: true,
        text: async () => html,
      }) as Response;
    try {
      const url = await fetchEbayListingOgImageUrl("https://www.ebay.com/itm/123456789012");
      expect(url).toBe("https://i.ebayimg.com/images/g/xx/s-l500.jpg");
    } finally {
      globalThis.fetch = orig;
    }
  });
});
