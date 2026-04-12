"use server";

import { auth } from "@/lib/auth";
import { processPendingScrapeJobs } from "@/services/scrape-worker.service";

/**
 * Runs at least one pending sold scrape job after the user queues work.
 *
 * The HTTP route `POST /api/jobs/process-scrapes` requires `CRON_SECRET` when that env is set,
 * so the browser cannot call it. This action uses the session instead.
 */
export async function kickScrapeWorkerAction(): Promise<{
  processed: number;
  completed: number;
  failed: number;
}> {
  const session = await auth();
  if (!session?.user?.id) {
    return { processed: 0, completed: 0, failed: 0 };
  }
  return processPendingScrapeJobs({ limit: 1 });
}
