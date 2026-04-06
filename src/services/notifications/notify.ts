import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { isPaidCollector } from "@/lib/billing/get-user-plan";

export type NotificationType = "price_alert_triggered" | "watchlist_listing_alert";

/**
 * Notification abstraction (MVP).
 *
 * Writes a NotificationEvent so you can later plug in email/push without changing alert logic.
 * TODO(notify): Replace/augment with real dispatch (email, push, webhook).
 */
export async function notifyUser(input: {
  userId: string;
  type: NotificationType;
  payload: Prisma.InputJsonValue;
}): Promise<void> {
  if (input.type === "watchlist_listing_alert" || input.type === "price_alert_triggered") {
    if (!(await isPaidCollector(input.userId))) return;
  }

  await prisma.notificationEvent.create({
    data: {
      userId: input.userId,
      type: input.type,
      payload: input.payload,
    },
  });

  // Also log in development for visibility.
  if (process.env.NODE_ENV === "development") {
    // eslint-disable-next-line no-console
    console.log("[notify]", input.type, { userId: input.userId, payload: input.payload });
  }
}

