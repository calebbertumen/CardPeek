"use client";

import { useState, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SetNameCombobox } from "@/components/search/set-name-combobox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CONDITION_OPTIONS } from "@/lib/normalize";
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

  const pid = (s: string) => (idPrefix ? `${idPrefix}-${s}` : s);

  return (
    <>
      <div className="flex w-full min-w-0 flex-nowrap items-end gap-2 overflow-x-auto pb-0.5 sm:gap-3 md:overflow-visible">
        <div className="min-w-[min(100%,8rem)] flex-[2] space-y-1.5 sm:min-w-0">
          <Label htmlFor={pid("name")} className="text-xs">
            Card name
          </Label>
          <Input
            id={pid("name")}
            name="name"
            placeholder="e.g. Charizard"
            required
            autoComplete="off"
            className="h-11 w-full min-w-0"
            defaultValue={defaults.name}
          />
        </div>
        <div className="min-w-[min(100%,5.5rem)] flex-1 space-y-1.5 sm:min-w-0">
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
        <div className="w-[4.25rem] shrink-0 space-y-1.5 sm:w-20">
          <Label htmlFor={pid("cardNumber")} className="text-xs">
            No.
          </Label>
          <Input
            id={pid("cardNumber")}
            name="cardNumber"
            placeholder="4"
            autoComplete="off"
            className="h-11 w-full px-2"
            defaultValue={defaults.cardNumber}
          />
        </div>
        <div className="w-[min(100%,10.5rem)] shrink-0 space-y-1.5 sm:w-44">
          <div className="flex min-h-[1rem] items-center gap-1">
            <Label htmlFor={pid("condition-select")} className="text-xs">
              Condition
            </Label>
            {viewerPlanId !== "collector" ? (
              <div className="group relative inline-flex items-center">
                <button
                  type="button"
                  tabIndex={0}
                  className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-muted-foreground/45 text-[9px] font-semibold leading-none text-muted-foreground transition-colors hover:border-primary/55 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  aria-label="Condition filters require Collector"
                >
                  i
                </button>
                <span
                  role="tooltip"
                  className="pointer-events-none absolute left-1/2 top-[calc(100%+6px)] z-[100] w-max max-w-[min(240px,calc(100vw-2rem))] -translate-x-1/2 rounded-md border border-border bg-popover px-2.5 py-1.5 text-[11px] leading-snug text-popover-foreground opacity-0 shadow-lg ring-1 ring-black/5 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
                >
                  Collector unlocks condition filters.
                </span>
              </div>
            ) : null}
          </div>
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
            <div
              id={pid("condition-select")}
              className="flex h-11 w-full min-w-0 max-w-full items-center rounded-lg border border-border bg-surface-alt px-2.5 text-sm text-foreground select-none"
              title="Collector unlocks condition filters"
            >
              <span className="truncate">
                {CONDITION_OPTIONS.find((o) => o.value === condition)?.label ?? condition}
              </span>
            </div>
          )}
        </div>
        <div className="flex shrink-0 items-end justify-center">{actionsSlot}</div>
      </div>
      <input type="hidden" name="condition" value={condition} readOnly aria-hidden />
    </>
  );
}
