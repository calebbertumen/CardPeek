"use client";

import { useFormState } from "react-dom";
import Link from "next/link";
import { resetPasswordStateAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ResetPasswordForm({
  token,
  callbackUrl = "/dashboard",
}: {
  token: string;
  callbackUrl?: string;
}) {
  const [state, formAction] = useFormState(resetPasswordStateAction, undefined);

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="callbackUrl" value={callbackUrl} />
      <div className="space-y-2">
        <Label htmlFor="password">New password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className="h-11"
        />
        <p className="text-xs text-muted-foreground">At least 8 characters.</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm">Confirm new password</Label>
        <Input
          id="confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
          className="h-11"
        />
      </div>
      {state?.error ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" className="h-11 w-full rounded-full">
        Update password
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        <Link
          href="/forgot-password"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Request a new link
        </Link>
      </p>
    </form>
  );
}
