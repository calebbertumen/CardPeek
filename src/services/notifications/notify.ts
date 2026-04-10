export type NotificationType = never;

/**
 * Notification abstraction (MVP).
 *
 * Writes a NotificationEvent so you can later plug in email/push without changing alert logic.
 * TODO(notify): Replace/augment with real dispatch (email, push, webhook).
 */
export async function notifyUser(input: {
  userId: string;
  type: NotificationType;
  payload: unknown;
}): Promise<void> {
  void input;
}

