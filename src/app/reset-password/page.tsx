import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata: Metadata = {
  title: "Reset password",
};

export default function ResetPasswordPage({
  searchParams,
}: {
  searchParams: { token?: string; callbackUrl?: string };
}) {
  const token = searchParams.token?.trim();
  const callbackUrl =
    searchParams.callbackUrl?.startsWith("/") && !searchParams.callbackUrl.startsWith("//")
      ? searchParams.callbackUrl
      : "/dashboard";

  if (!token) {
    return (
      <AuthCard title="Invalid link" subtitle="This password reset link is missing a token.">
        <p className="text-sm text-muted-foreground">
          Request a new reset email from the forgot password page.
        </p>
        <p className="mt-6 text-center text-sm">
          <Link
            href="/forgot-password"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Forgot password
          </Link>
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Choose a new password" subtitle="Enter a new password for your account.">
      <ResetPasswordForm token={token} callbackUrl={callbackUrl} />
    </AuthCard>
  );
}
