"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

const POLL_MS = 2500;
const POLL_BUDGET_MS = 60_000;

/**
 * Triggers the scrape worker once and periodically refreshes the route so server components pick up new cache rows
 * without blocking the search request.
 */
export function RefreshKick({ enabled }: { enabled: boolean }) {
  const router = useRouter();
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
    const interval = setInterval(() => {
      router.refresh();
    }, POLL_MS);
    const timeout = setTimeout(() => clearInterval(interval), POLL_BUDGET_MS);
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [enabled, router]);

  return null;
}
