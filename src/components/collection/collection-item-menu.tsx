"use client";

import { useState, useTransition } from "react";
import { MoreVertical, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { removeManyFromCollectionAction } from "@/actions/collection";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { CollectionCondition } from "@prisma/client";

export function CollectionItemMenu(input: {
  cardId: string;
  condition: CollectionCondition;
  quantity: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [mode, setMode] = useState<"root" | "remove">("root");
  const [removeCount, setRemoveCount] = useState(1);

  const refreshSoon = () => {
    // Ensure refresh runs after the menu finishes closing/unmounting.
    setTimeout(() => router.refresh(), 0);
  };

  return (
    <DropdownMenu
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setMode("root");
      }}
    >
      <DropdownMenuTrigger
        className={cn(
          buttonVariants({ variant: "ghost", size: "icon" }),
          "h-8 w-8 rounded-full",
        )}
        aria-label="Open item menu"
        disabled={isPending}
      >
        <MoreVertical className="h-4 w-4" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className={cn(mode === "remove" ? "w-72 min-w-[18rem]" : "w-40")}
      >
        <DropdownMenuGroup>
          {mode === "root" ? (
            <DropdownMenuItem
              variant="destructive"
              closeOnClick={input.quantity <= 1}
              onClick={() => {
                if (input.quantity <= 1) {
                  startTransition(() => {
                    void (async () => {
                      const res = await removeManyFromCollectionAction({
                        cardId: input.cardId,
                        condition: input.condition,
                        count: 1,
                      });
                      if (res.ok) {
                        setOpen(false);
                        refreshSoon();
                      }
                    })();
                  });
                  return;
                }
                setRemoveCount(1);
                setMode("remove");
              }}
              disabled={isPending}
            >
              <Trash2 className="h-4 w-4" aria-hidden />
              <span className="font-medium">Remove</span>
            </DropdownMenuItem>
          ) : (
            <div className="px-2 py-2">
              <p className="px-1 pb-2 text-xs font-medium text-muted-foreground">
                Remove how many?
              </p>
              <input
                type="number"
                min={1}
                max={Math.max(1, input.quantity)}
                step={1}
                value={removeCount}
                onChange={(e) => {
                  const v = Math.floor(Number(e.target.value));
                  if (!Number.isFinite(v)) return;
                  const clamped = Math.min(Math.max(1, v), Math.max(1, input.quantity));
                  setRemoveCount(clamped);
                }}
                className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground"
                aria-label="Remove quantity"
              />
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  className={cn(
                    buttonVariants({ variant: "destructive", size: "sm" }),
                    "h-9 min-w-0 flex-1 rounded-md",
                  )}
                  disabled={isPending}
                  onClick={() => {
                    startTransition(() => {
                      void (async () => {
                        const res = await removeManyFromCollectionAction({
                          cardId: input.cardId,
                          condition: input.condition,
                          count: removeCount,
                        });
                        if (res.ok) {
                          setMode("root");
                          setOpen(false);
                          refreshSoon();
                        }
                      })();
                    });
                  }}
                >
                  Remove
                </button>
                <button
                  type="button"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    "h-9 min-w-0 flex-1 rounded-md",
                  )}
                  onClick={() => setMode("root")}
                  disabled={isPending}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

