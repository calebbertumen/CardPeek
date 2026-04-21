"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { addToCollectionAction } from "@/actions/collection";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { CollectionCondition } from "@prisma/client";
import type { AccessTier } from "@/lib/billing/access";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  card: {
    normalizedCardKey: string;
    name: string;
    setName: string | null;
    cardNumber: string | null;
    imageSmall: string;
    imageLarge: string;
  };
  /** Collector may choose condition; Starter/Preview add as Near Mint only (matches no condition filter on search). */
  tier: AccessTier;
  size?: "sm" | "md";
};

const CONDITION_OPTIONS: Array<{ value: CollectionCondition; label: string }> = [
  { value: "NM", label: "Near Mint (NM)" },
  { value: "LP", label: "Lightly Played (LP)" },
  { value: "MP", label: "Moderately Played (MP)" },
  { value: "HP", label: "Heavily Played (HP)" },
  { value: "DMG", label: "Damaged (DMG)" },
];

export function AddToCollectionMenu({ className, card, tier, size = "md" }: Props) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<
    | { kind: "idle" }
    | { kind: "error"; message: string }
    | { kind: "success"; message: string }
  >({ kind: "idle" });
  const [isPending, startTransition] = useTransition();

  const triggerLabel = useMemo(() => {
    if (isPending) return "Adding…";
    return "Add to Collection";
  }, [isPending]);

  const allowConditionChoice = tier === "collector";

  const addWithCondition = (condition: CollectionCondition) => {
    startTransition(() => {
      void (async () => {
        const res = await addToCollectionAction({
          cardId: card.normalizedCardKey,
          cardName: card.name,
          imageUrl: card.imageLarge || card.imageSmall,
          setName: card.setName,
          cardNumber: card.cardNumber,
          condition,
        });
        if (!res.ok) {
          setState({ kind: "error", message: res.message });
          return;
        }
        setState({ kind: "success", message: "Added to your collection." });
        setOpen(false);
      })();
    });
  };

  useEffect(() => {
    if (state.kind !== "success") return;
    const t = window.setTimeout(() => setState({ kind: "idle" }), 2200);
    return () => window.clearTimeout(t);
  }, [state.kind]);

  return (
    <div className={cn("space-y-2", className)}>
      {!allowConditionChoice ? (
        <button
          type="button"
          className={cn(
            buttonVariants({
              variant: "outline",
              size: size === "sm" ? "sm" : "default",
            }),
            "rounded-full",
          )}
          disabled={isPending}
          onClick={() => addWithCondition("NM")}
        >
          <Plus className="mr-2 h-4 w-4" aria-hidden />
          {triggerLabel}
        </button>
      ) : (
        <DropdownMenu open={open} onOpenChange={setOpen}>
          <DropdownMenuTrigger
            className={cn(
              buttonVariants({
                variant: "outline",
                size: size === "sm" ? "sm" : "default",
              }),
              "rounded-full",
            )}
            disabled={isPending}
          >
            <Plus className="mr-2 h-4 w-4" aria-hidden />
            {triggerLabel}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Select condition</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {CONDITION_OPTIONS.map((opt) => (
                <DropdownMenuItem
                  key={opt.value}
                  onClick={() => addWithCondition(opt.value)}
                  disabled={isPending}
                >
                  {opt.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {state.kind === "error" ? (
        <p className="text-xs text-destructive" role="alert">
          {state.message}
        </p>
      ) : state.kind === "success" ? (
        <p className="text-xs text-muted-foreground" role="status" aria-live="polite">
          {state.message}
        </p>
      ) : null}
    </div>
  );
}

