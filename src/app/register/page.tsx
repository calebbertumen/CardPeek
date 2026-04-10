import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/auth-card";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = {
  title: "Get started",
};

export default function RegisterPage({
  searchParams,
}: {
  searchParams: { callbackUrl?: string };
}) {
  const callbackUrl =
    searchParams.callbackUrl?.startsWith("/") && !searchParams.callbackUrl.startsWith("//")
      ? searchParams.callbackUrl
      : "/dashboard";

  return (
    <AuthCard
      title="Create your account"
      subtitle="Starter includes 1 search per day and 3 lifetime fresh data updates."
    >
      <RegisterForm callbackUrl={callbackUrl} />
    </AuthCard>
  );
}
