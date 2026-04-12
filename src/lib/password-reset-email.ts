import { getAppOrigin } from "@/lib/app-origin";

export async function sendPasswordResetEmail(to: string, rawToken: string): Promise<void> {
  const origin = getAppOrigin();
  const resetUrl = `${origin}/reset-password?token=${encodeURIComponent(rawToken)}`;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    if (process.env.NODE_ENV === "development") {
      console.info("[password-reset] RESEND_API_KEY not set; reset link (dev only):\n", resetUrl);
    } else {
      console.error("[password-reset] RESEND_API_KEY is not set; cannot send reset email.");
    }
    return;
  }

  const from =
    process.env.RESEND_FROM_EMAIL ?? "CardPeek <onboarding@resend.dev>";

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

  if (!res.ok) {
    const body = await res.text();
    console.error("[password-reset] Resend API error:", res.status, body);
  }
}
