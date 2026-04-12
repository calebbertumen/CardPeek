"use server";

import bcrypt from "bcryptjs";
import { CredentialsSignin } from "next-auth";
import { signIn } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/password-reset-email";
import {
  generatePasswordResetSecret,
  hashPasswordResetSecret,
  PASSWORD_RESET_TOKEN_TTL_MS,
} from "@/lib/password-reset-token";

export type AuthFormState = { error?: string; success?: string } | undefined;

function safeInternalPath(raw: string | undefined, fallback: string): string {
  if (raw && raw.startsWith("/") && !raw.startsWith("//")) return raw;
  return fallback;
}

export async function registerStateAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = formData.get("email")?.toString().trim().toLowerCase();
  const password = formData.get("password")?.toString() ?? "";
  const confirm = formData.get("confirm")?.toString() ?? "";

  if (!email || !password) {
    return { error: "Email and password are required." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }
  if (password !== confirm) {
    return { error: "Passwords do not match." };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "An account with this email already exists." };
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.create({
    data: { email, passwordHash },
  });

  const redirectTo = safeInternalPath(formData.get("callbackUrl")?.toString(), "/dashboard");

  try {
    await signIn("credentials", { email, password, redirectTo });
  } catch (e) {
    if (e instanceof CredentialsSignin) {
      return { error: "Account created but sign-in failed. Try logging in." };
    }
    throw e;
  }
  return undefined;
}

export async function loginStateAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = formData.get("email")?.toString().trim().toLowerCase();
  const password = formData.get("password")?.toString() ?? "";

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const redirectTo = safeInternalPath(formData.get("callbackUrl")?.toString(), "/dashboard");

  try {
    await signIn("credentials", { email, password, redirectTo });
  } catch (e) {
    if (e instanceof CredentialsSignin) {
      return { error: "Invalid email or password." };
    }
    throw e;
  }
  return undefined;
}

const PASSWORD_RESET_GENERIC_SUCCESS: AuthFormState = {
  success:
    "If an account exists for that email, we sent a link to reset your password. Check your inbox.",
};

export async function requestPasswordResetAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = formData.get("email")?.toString().trim().toLowerCase();
  if (!email) {
    return { error: "Email is required." };
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, passwordHash: true },
  });

  if (!user?.passwordHash) {
    return PASSWORD_RESET_GENERIC_SUCCESS;
  }

  const rawToken = generatePasswordResetSecret();
  const tokenHash = hashPasswordResetSecret(rawToken);
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS);

  await prisma.$transaction([
    prisma.passwordResetToken.deleteMany({ where: { userId: user.id } }),
    prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt },
    }),
  ]);

  await sendPasswordResetEmail(email, rawToken);
  return PASSWORD_RESET_GENERIC_SUCCESS;
}

export async function resetPasswordStateAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const token = formData.get("token")?.toString().trim();
  const password = formData.get("password")?.toString() ?? "";
  const confirm = formData.get("confirm")?.toString() ?? "";

  if (!token) {
    return { error: "Reset link is invalid or expired." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }
  if (password !== confirm) {
    return { error: "Passwords do not match." };
  }

  const tokenHash = hashPasswordResetSecret(token);
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { user: { select: { email: true } } },
  });

  if (!record || record.expiresAt < new Date()) {
    if (record) {
      await prisma.passwordResetToken.delete({ where: { id: record.id } }).catch(() => undefined);
    }
    return { error: "This reset link is invalid or has expired. Request a new one." };
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const email = record.user.email;

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.deleteMany({ where: { userId: record.userId } }),
  ]);

  const redirectTo = safeInternalPath(formData.get("callbackUrl")?.toString(), "/dashboard");

  try {
    await signIn("credentials", { email, password, redirectTo });
  } catch (e) {
    if (e instanceof CredentialsSignin) {
      return { error: "Password updated. Sign in with your new password." };
    }
    throw e;
  }
  return undefined;
}
