import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/auth-card";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = {
  title: "Forgot password",
};

export default function ForgotPasswordPage() {
  return (
    <AuthCard title="Forgot password" subtitle="Enter your email to get a reset link.">
      <ForgotPasswordForm />
    </AuthCard>
  );
}
