import { NextResponse } from "next/server";
import { processPendingScrapeJobs } from "@/services/scrape-worker.service";

/**
 * MVP worker endpoint.
 *
 * Call this from a cron (e.g. every minute) or from the client when a user queues a refresh.
 * This is intentionally lightweight and easy to swap for a real queue/worker later.
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

