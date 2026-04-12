"use client";

import { useEffect, useRef } from "react";
import { kickScrapeWorkerAction } from "@/actions/kick-scrape-worker";

/**
 * Triggers the scrape worker once while a refresh is in progress (does not block the search request).
 * Uses a server action so jobs run even when `CRON_SECRET` protects `POST /api/jobs/process-scrapes`.
 */
export function RefreshKick({ enabled }: { enabled: boolean }) {
  const posted = useRef(false);

  useEffect(() => {
    if (!enabled) {
      posted.current = false;
      return;
    }
    if (!posted.current) {
      posted.current = true;
      void kickScrapeWorkerAction().catch(() => {});
    }
  }, [enabled]);

  return null;
}
