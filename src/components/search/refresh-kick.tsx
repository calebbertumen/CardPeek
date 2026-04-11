"use client";

import { useEffect, useRef } from "react";

/**
 * Triggers the scrape worker once while a refresh is in progress (does not block the search request).
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
      fetch("/api/jobs/process-scrapes?limit=1", { method: "POST" }).catch(() => {});
    }
  }, [enabled]);

  return null;
}
