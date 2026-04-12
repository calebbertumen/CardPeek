"use client";

import { useFormState } from "react-dom";
import Link from "next/link";
import { requestPasswordResetAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ForgotPasswordForm() {
  const [state, formAction] = useFormState(requestPasswordResetAction, undefined);

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required className="h-11" />
        <p className="text-xs text-muted-foreground">
          We will email you a link to choose a new password if this address has a password-based
          account.
        </p>
      </div>
      {state?.error ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
      {state?.success ? (
        <p className="text-sm text-foreground" role="status">
          {state.success}
        </p>
      ) : null}
      <Button type="submit" className="h-11 w-full rounded-full">
        Send reset link
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
