"use server";

import bcrypt from "bcryptjs";
import { CredentialsSignin } from "next-auth";
import { signIn } from "@/lib/auth";
import { prisma } from "@/lib/db";

export type AuthFormState = { error?: string } | undefined;

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
