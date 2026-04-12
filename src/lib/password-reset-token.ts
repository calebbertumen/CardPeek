import { createHash, randomBytes } from "node:crypto";

export const PASSWORD_RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

export function generatePasswordResetSecret(): string {
  return randomBytes(32).toString("base64url");
}

export function hashPasswordResetSecret(secret: string): string {
  return createHash("sha256").update(secret, "utf8").digest("hex");
}
