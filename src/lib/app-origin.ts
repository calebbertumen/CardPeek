/**
 * Public site origin for absolute URLs (emails, redirects). No trailing slash.
 */
export function getAppOrigin(): string {
  const fromEnv =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    process.env.AUTH_URL?.replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`;
  return "http://localhost:3000";
}
