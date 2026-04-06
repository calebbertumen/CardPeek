"use client";

import { useEffect, useRef } from "react";

/**
 * Fires a one-shot request to process scrape jobs.
 * This keeps the search UX fast (never blocks) while still letting paid users get fresh data soon.
 *
 * TODO(queue): Replace with real queue/worker (Upstash, Inngest, etc).
 */
export function RefreshKick({ enabled }: { enabled: boolean }) {
  const didRun = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    if (didRun.current) return;
    didRun.current = true;
    fetch("/api/jobs/process-scrapes?limit=1", { method: "POST" }).catch(() => {});
  }, [enabled]);

  return null;
}

