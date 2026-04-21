import { NextResponse } from "next/server";
import { processPendingScrapeJobs } from "@/services/scrape-worker.service";

/**
 * MVP worker endpoint.
 *
 * Call from cron (e.g. every minute) with `Authorization: Bearer <CRON_SECRET>` when `CRON_SECRET` is set.
 * **Browser clients** cannot send that secret  -  use {@link kickScrapeWorkerAction} instead (session-based).
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
  const limitRaw = url.searchParams.get("limit");
  const limit = limitRaw ? Number(limitRaw) : undefined;

  const result = await processPendingScrapeJobs({ limit });
  return NextResponse.json(result, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

