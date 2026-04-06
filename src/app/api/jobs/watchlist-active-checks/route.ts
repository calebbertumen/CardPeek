import { NextResponse } from "next/server";
import { runWatchlistActiveScrapeCycle } from "@/services/scrape-scheduler.service";

/**
 * Watchlist-driven active (BIN) listing checks — run on a cron (e.g. every 15–30 minutes).
 * Does not touch sold comps; scales with unique watched variants, not user count.
 */
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const url = new URL(request.url);
  const maxRaw = url.searchParams.get("maxVariants");
  const maxVariants = maxRaw ? Number(maxRaw) : undefined;

  const result = await runWatchlistActiveScrapeCycle({
    maxVariants: maxVariants !== undefined && Number.isFinite(maxVariants) ? maxVariants : undefined,
  });

  return NextResponse.json(result, {
    headers: { "Cache-Control": "no-store" },
  });
}
