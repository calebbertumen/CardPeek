import { getAppOrigin } from "@/lib/app-origin";

export type PasswordResetEmailOutcome =
  | { outcome: "sent"; messageId?: string }
  | { outcome: "dev_terminal_log"; resetUrl: string }
  | { outcome: "send_failed"; httpStatus: number; message: string }
  | { outcome: "missing_api_key_production" };

/**
 * Vercel/env paste often wraps values in extra quotes; Resend rejects those for `from`.
 * Accepts `email@x.com` or `Name <email@x.com>` (single space before `<`).
 */
export function normalizeResendFromAddress(raw: string): string {
  let s = raw.trim();
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    s = s.slice(1, -1).trim();
  }
  // "Name<email>" without space before `<` is invalid for Resend
  if (/^[^<\s]+</.test(s)) {
    s = s.replace(/^([^<]+)</, "$1 <");
  }
  return s;
}

function parseResendErrorMessage(bodyText: string): string {
  try {
    const j = JSON.parse(bodyText) as { message?: string | string[] };
    if (Array.isArray(j.message)) return j.message.join(" ");
    if (typeof j.message === "string") return j.message;
  } catch {
    /* ignore */
  }
  return bodyText.slice(0, 500);
}

/**
 * Sends the password reset email via Resend, or logs the link in development when no API key is set.
 */
export async function sendPasswordResetEmail(
  to: string,
  rawToken: string,
): Promise<PasswordResetEmailOutcome> {
  const origin = getAppOrigin();
  const resetUrl = `${origin}/reset-password?token=${encodeURIComponent(rawToken)}`;

  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    if (process.env.NODE_ENV === "development") {
      console.info(
        "[password-reset] RESEND_API_KEY not set; reset link (copy from terminal):\n",
        resetUrl,
      );
      return { outcome: "dev_terminal_log", resetUrl };
    }
    console.error("[password-reset] RESEND_API_KEY is not set; cannot send reset email.");
    return { outcome: "missing_api_key_production" };
  }

  const from = normalizeResendFromAddress(
    process.env.RESEND_FROM_EMAIL ?? "CardPeek <onboarding@resend.dev>",
  );

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: "Reset your CardPeek password",
      html: `<p>We received a request to reset your CardPeek password.</p>
<p><a href="${resetUrl}">Set a new password</a></p>
<p>This link expires in one hour. If you did not ask for this, you can ignore this email.</p>`,
      text: `Reset your password: ${resetUrl}\n\nThis link expires in one hour.`,
    }),
  });

  const bodyText = await res.text();

  if (!res.ok) {
    const message = parseResendErrorMessage(bodyText);
    console.error("[password-reset] Resend API error:", res.status, bodyText);
    return { outcome: "send_failed", httpStatus: res.status, message };
  }

  let messageId: string | undefined;
  try {
    const json = JSON.parse(bodyText) as { data?: { id?: string } };
    messageId = json.data?.id;
  } catch {
    /* non-JSON success is unexpected */
  }

  console.info("[password-reset] Resend accepted email", { to, messageId });
  return { outcome: "sent", messageId };
}
