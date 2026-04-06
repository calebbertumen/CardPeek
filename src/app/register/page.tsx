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
      subtitle="Starter includes 7 searches per day and tracking for up to 3 cards."
    >
      <RegisterForm callbackUrl={callbackUrl} />
    </AuthCard>
  );
}
