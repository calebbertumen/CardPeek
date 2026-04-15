import { prisma } from "@/lib/db";
import type { Session } from "next-auth";

/**
 * Resolves the canonical `User` row for the session (by id, then by email).
 * Use for billing and any DB-scoped work so Stripe-synced fields match the signed-in account.
 */
export async function getCanonicalUserFromSession(
  session: Session | null | undefined,
): Promise<{ id: string; email: string } | null> {
  const id = session?.user?.id;
  const email = session?.user?.email;
  if (!email) return null;

  const byId = id
    ? await prisma.user.findUnique({ where: { id }, select: { id: true, email: true } })
    : null;
  if (byId) return { id: byId.id, email: byId.email };

  const byEmail = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true } });
  return byEmail ? { id: byEmail.id, email: byEmail.email } : null;
}

/**
 * Ensures we use a real `User.id` from the current DB connection.
 * This avoids mismatches when a JWT `sub` is stale or from another environment.
 */
export async function requireDbUser(session: Session | null | undefined): Promise<{ id: string; email: string }> {
  const u = await getCanonicalUserFromSession(session);
  if (!u) throw new Error("UNAUTHORIZED");
  return u;
}

