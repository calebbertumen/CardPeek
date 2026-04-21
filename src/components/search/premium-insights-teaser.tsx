import Link from "next/link";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  /** Logged-out preview uses register; starter uses pricing. */
  variant: "preview" | "starter";
};

/**
 * Non-intrusive upgrade moment: suggests richer insight without blocking core value.
 */
export function PremiumInsightsTeaser({ variant }: Props) {
  const href = variant === "preview" ? "/register?callbackUrl=/pricing" : "/pricing";
  const cta = variant === "preview" ? "Create account & view plans" : "View Collector";

  return (
    <div className="relative overflow-hidden rounded-xl border border-border/70 bg-gradient-to-br from-muted/40 to-muted/10 px-4 py-4 sm:px-5">
      <div className="pointer-events-none absolute inset-0 opacity-[0.35]">
        <div className="flex h-full flex-col justify-end gap-2 p-4 blur-[2px]">
          <div className="h-2 w-full max-w-[85%] rounded-full bg-muted-foreground/25" />
          <div className="flex gap-1">
            <div className="h-10 flex-1 rounded-md bg-primary/15" />
            <div className="h-10 flex-1 rounded-md bg-primary/10" />
            <div className="h-10 flex-1 rounded-md bg-primary/20" />
          </div>
          <div className="h-1.5 w-2/3 rounded-full bg-muted-foreground/20" />
          <div className="h-1.5 w-1/2 rounded-full bg-muted-foreground/15" />
        </div>
      </div>
      <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="flex gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border/80 bg-card/90 shadow-sm">
            <Lock className="h-4 w-4 text-muted-foreground" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium leading-snug text-foreground">Collector</p>
            <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
              Verify before you buy or sell. See the exact comps behind this snapshot and why prices vary.
            </p>
          </div>
        </div>
        <Button
          asChild
          size="sm"
          variant="secondary"
          className="shrink-0 rounded-full px-5 shadow-sm sm:self-center"
        >
          <Link href={href}>{cta}</Link>
        </Button>
      </div>
    </div>
  );
}
