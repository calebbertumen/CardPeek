import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/auth-card";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Login",
};

export default function LoginPage({
  searchParams,
}: {
  searchParams: { callbackUrl?: string };
}) {
  const callbackUrl =
    searchParams.callbackUrl?.startsWith("/") && !searchParams.callbackUrl.startsWith("//")
      ? searchParams.callbackUrl
      : "/dashboard";

  return (
    <AuthCard title="Welcome back" subtitle="Sign in to continue searching without limits.">
      <LoginForm callbackUrl={callbackUrl} />
    </AuthCard>
  );
}
