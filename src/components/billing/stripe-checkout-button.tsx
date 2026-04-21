"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function StripeCheckoutButton({ children = "Unlock sales" }: { children?: string }) {
  const [pending, setPending] = useState(false);

  return (
    <Button
      className="w-full rounded-full"
      disabled={pending}
      onClick={async () => {
        try {
          setPending(true);
          const res = await fetch("/api/stripe/checkout", { method: "POST" });
          const json = (await res.json()) as { url?: string; error?: string };
          if (json.url) window.location.href = json.url;
        } finally {
          setPending(false);
        }
      }}
    >
      {pending ? "Redirecting…" : children}
    </Button>
  );
}

