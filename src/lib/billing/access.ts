import type { PlanId } from "@/lib/billing/plans";

/**
 * Viewer access states:
 * - preview: not logged in (strict DB-only, limited lifetime searches)
 * - starter: logged in, free tier
 * - collector: logged in, paid tier
 */
export type AccessTier = "preview" | PlanId;

