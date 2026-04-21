"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ClearInputButton } from "@/components/ui/clear-input-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CardNameCombobox } from "@/components/search/card-name-combobox";
import { SetNameCombobox } from "@/components/search/set-name-combobox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CONDITION_OPTIONS } from "@/lib/normalize";
import { cn } from "@/lib/utils";
import type { ConditionBucket } from "@prisma/client";

export type CardSearchFormDefaults = {
  name: string;
  setName: string;
  cardNumber: string;
  condition: ConditionBucket | string;
};

const EMPTY_DEFAULTS: CardSearchFormDefaults = {
  name: "",
  setName: "",
  cardNumber: "",
  condition: "raw_nm",
};

type CardSearchFieldsProps = {
  /** Prefix for input ids when multiple instances exist on a page */
  idPrefix?: string;
  defaults?: Partial<CardSearchFormDefaults>;
  actionsSlot: ReactNode;
  viewerPlanId?: "starter" | "collector";
};

export function CardSearchFields({
  idPrefix = "",
  defaults: defaultsProp,
  actionsSlot,
  viewerPlanId = "starter",
}: CardSearchFieldsProps) {
  const defaults = { ...EMPTY_DEFAULTS, ...defaultsProp };
  const [condition, setCondition] = useState<string>(() =>
    String(defaults.condition || "raw_nm"),
  );
  const [cardNumber, setCardNumber] = useState(() => defaults.cardNumber);

  useEffect(() => {
    setCardNumber(defaults.cardNumber);
  }, [defaults.cardNumber]);

  const pid = (s: string) => (idPrefix ? `${idPrefix}-${s}` : s);

  return (
    <>
      <div className="flex w-full min-w-0 flex-col items-stretch gap-3 pb-0.5 sm:flex-row sm:flex-nowrap sm:items-end sm:gap-3 sm:overflow-x-auto md:overflow-visible">
        <div className="w-full min-w-0 flex-[2] space-y-1.5 sm:min-w-0">
          <Label htmlFor={pid("name")} className="text-xs">
            Card name
          </Label>
          <CardNameCombobox
            id={pid("name")}
            name="name"
            placeholder="e.g. Charizard"
            required
            className="h-11 w-full min-w-0"
            defaultValue={defaults.name}
          />
        </div>
        <div className="w-full min-w-0 flex-1 space-y-1.5 sm:min-w-0">
          <Label htmlFor={pid("setName")} className="text-xs">
            Set name
          </Label>
          <SetNameCombobox
            id={pid("setName")}
            name="setName"
            defaultValue={defaults.setName}
            className="h-11 w-full min-w-0"
            placeholder="Type or pick a set"
          />
        </div>
        <div className="w-full shrink-0 space-y-1.5 sm:w-20">
          <Label htmlFor={pid("cardNumber")} className="text-xs">
            No.
          </Label>
          <div className="relative">
            <Input
              id={pid("cardNumber")}
              name="cardNumber"
              autoComplete="off"
              value={cardNumber}
              onChange={(e) => setCardNumber(e.target.value)}
              className={cn("h-11 w-full px-2", cardNumber.length > 0 && "pr-9")}
            />
            {cardNumber.length > 0 ? (
              <ClearInputButton onClear={() => setCardNumber("")} aria-label="Clear card number" />
            ) : null}
          </div>
        </div>
        <div className="w-full shrink-0 space-y-1.5 sm:w-44">
          <Label htmlFor={pid("condition-select")} className="text-xs">
            Condition
          </Label>
          {viewerPlanId === "collector" ? (
            <Select
              value={condition}
              onValueChange={(v) => {
                if (v) setCondition(v);
              }}
            >
              <SelectTrigger id={pid("condition-select")} className="h-11 w-full min-w-0 max-w-full">
                <SelectValue placeholder="Condition" />
              </SelectTrigger>
              <SelectContent>
                {CONDITION_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="group relative w-full">
              <div
                id={pid("condition-select")}
                tabIndex={0}
                className="flex h-11 w-full min-w-0 max-w-full cursor-default items-center rounded-lg border border-border bg-surface-alt px-2.5 text-sm text-foreground select-none outline-none transition-colors hover:border-border focus-visible:border-border focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                aria-label="Condition. Collector unlocks other condition filters."
              >
                <span className="truncate">
                  {CONDITION_OPTIONS.find((o) => o.value === condition)?.label ?? condition}
                </span>
              </div>
              <span
                role="tooltip"
                className="pointer-events-none absolute left-0 top-[calc(100%+6px)] z-[100] w-max max-w-[min(240px,calc(100vw-2rem))] rounded-md border border-border bg-popover px-2.5 py-1.5 text-[11px] leading-snug text-popover-foreground opacity-0 shadow-lg ring-1 ring-black/5 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
              >
                Collector unlocks condition filters.
              </span>
            </div>
          )}
        </div>
        <div className="flex w-full shrink-0 items-stretch justify-center sm:w-auto sm:items-end [&_button]:w-full sm:[&_button]:w-auto">
          {actionsSlot}
        </div>
      </div>
      <input type="hidden" name="condition" value={condition} readOnly aria-hidden />
    </>
  );
}
