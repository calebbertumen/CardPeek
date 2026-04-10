"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { searchCardStateAction, type SearchCardState } from "@/actions/search-card";
import { buildSearchQueryStringFromFields, type SearchPageFormDefaults } from "@/lib/search-url";
import { Button } from "@/components/ui/button";
import { CardSearchFields } from "@/components/search/card-search-fields";
import { searchBarWidthClassName } from "@/components/search/search-bar-layout";
import { SearchBarShell } from "@/components/search/search-bar-shell";
import { SearchResults } from "./search-results";
import { SearchResultsSkeleton } from "./search-results-skeleton";

function SubmitButton({ pending }: { pending: boolean }) {
  return (
    <Button type="submit" disabled={pending} className="min-h-11 min-w-[8.5rem] rounded-full px-8 shadow-sm">
      {pending ? "Searching…" : "See results"}
    </Button>
  );
}

function ResultsSection({ state, pending }: { state: SearchCardState | null; pending: boolean }) {
  if (pending) {
    return <SearchResultsSkeleton />;
  }
  if (state?.ok) {
    return <SearchResults data={state.data} tier={state.tier} />;
  }
  if (state === null) {
    return (
      <div className="mt-8 rounded-2xl border border-dashed border-border/80 bg-surface-alt/40 px-6 py-14 text-center">
        <p className="text-sm font-medium text-foreground">Run a search to see comps</p>
        <p className="mt-2 text-sm text-muted-foreground">
          We&apos;ll pull the canonical card image and the most recent sold listings for your condition bucket.
        </p>
      </div>
    );
  }
  if (state?.ok === false && state.code === "NO_DATA") {
    const t = state.tier;
    return (
      <div className="mt-10 rounded-2xl border border-border/80 bg-card p-6 shadow-lg shadow-black/25 sm:p-8">
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">Data not available yet</p>
          <p className="text-sm text-muted-foreground">{state.message}</p>
          {t === "preview" ? (
            <p className="text-sm text-muted-foreground">
              Create a free account to unlock more searches and a fuller market snapshot.
            </p>
          ) : t === "starter" ? (
            <p className="text-sm text-muted-foreground">
              Collector gets you newly updated data sooner, plus the most complete sales snapshot we have.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              A refresh may already be queued. Data is refreshed automatically when needed; most cards update within
              24–72 hours.
            </p>
          )}
        </div>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          {t === "preview" ? (
            <>
              <Button asChild className="rounded-full px-8">
                <Link href="/register?callbackUrl=/search">Create free account</Link>
              </Button>
              <Button asChild variant="outline" className="rounded-full px-8">
                <Link href="/login?callbackUrl=/search">Log in</Link>
              </Button>
            </>
          ) : t === "starter" ? (
            <Button asChild className="rounded-full px-8">
              <Link href="/pricing">Upgrade to Collector</Link>
            </Button>
          ) : null}
        </div>
        <p className="mt-5 text-xs text-muted-foreground">
          Based on recent market sales. Updated automatically when needed. Data may not reflect real-time listings.
        </p>
      </div>
    );
  }

  return null;
}

type SearchExperienceProps = {
  initialFormState: SearchCardState | null;
  formDefaults: SearchPageFormDefaults;
  viewerPlanId: "starter" | "collector";
};

export function SearchExperience({ initialFormState, formDefaults, viewerPlanId }: SearchExperienceProps) {
  const router = useRouter();
  const [state, setState] = useState<SearchCardState | null>(initialFormState);
  const stateRef = useRef<SearchCardState | null>(initialFormState);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  stateRef.current = state;

  useEffect(() => {
    if (state?.ok === false && state.code === "VALIDATION") {
      formRef.current?.querySelector<HTMLInputElement>('input[name="name"]')?.focus();
    }
  }, [state]);

  return (
    <form
      ref={formRef}
      action={(formData) => {
        startTransition(() => {
          void (async () => {
            const next = await searchCardStateAction(stateRef.current, formData);
            setState(next);
            const name = String(formData.get("name") ?? "").trim();
            if (name) {
              const qs = buildSearchQueryStringFromFields({
                name,
                setName: String(formData.get("setName") ?? ""),
                cardNumber: String(formData.get("cardNumber") ?? ""),
                condition: String(formData.get("condition") ?? "raw_nm"),
              });
              if (qs) router.replace(`/search?${qs}`, { scroll: false });
            }
          })();
        });
      }}
      className="flex w-full flex-col"
    >
      {/* Full viewport-width search strip, directly under the site header */}
      <div className="sticky top-14 z-30 w-full border-b border-border/60 bg-background/95 backdrop-blur-md sm:top-16">
        <div className="w-full py-4 sm:py-5">
          <div className={searchBarWidthClassName}>
            <SearchBarShell
              fieldsSlot={
                <CardSearchFields
                  idPrefix="results"
                  defaults={formDefaults}
                  viewerPlanId={viewerPlanId}
                  actionsSlot={<SubmitButton pending={isPending} />}
                />
              }
              footerSlot={
                state?.ok === false ? (
                  state.code === "LIMIT" ? (
                    <div className="mt-4 rounded-xl border border-border/80 bg-surface-alt/35 px-4 py-4 text-sm">
                      <p className="font-medium text-foreground">
                        {state.message.includes("Preview limit")
                          ? "Preview limit reached"
                          : state.message.includes("lifetime") || state.message.includes("fresh data")
                            ? "Fresh data limit reached"
                            : "Daily search limit reached"}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {state.message.includes("Preview limit")
                          ? "Create a free account to keep exploring card prices and recent market data."
                            : state.message.includes("lifetime") || state.message.includes("fresh data")
                              ? state.message
                            : state.tier === "collector"
                            ? "Collector includes unlimited searches. You can try again tomorrow."
                            : "Starter includes limited searches. Upgrade to Collector to unlock sold listing details."}
                      </p>
                      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                        {state.message.includes("Preview limit") || state.tier !== "collector" ? (
                          <>
                            <Button asChild className="rounded-full px-6">
                              <Link href="/register?callbackUrl=/search">
                                {state.message.includes("Preview limit") ? "Create free account" : "Upgrade to Collector"}
                              </Link>
                            </Button>
                            <Button asChild variant="outline" className="rounded-full px-6">
                              <Link href={state.message.includes("Preview limit") ? "/login?callbackUrl=/search" : "/pricing"}>
                                {state.message.includes("Preview limit") ? "Log in" : "Compare plans"}
                              </Link>
                            </Button>
                          </>
                        ) : null}
                        <span className="text-xs text-muted-foreground sm:ml-auto">
                          {state.message.includes("Preview limit")
                            ? "Free accounts unlock more searches and more detailed snapshots."
                            : state.tier === "collector"
                              ? "Limits protect the service from abuse; normal usage rarely hits this cap."
                              : "Search limits help keep CardPeek fast and reliable."}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
                      role="alert"
                    >
                      {state.message}
                    </div>
                  )
                ) : null
              }
            />
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-5xl px-4 pb-10 pt-8 sm:px-6 sm:pb-14 sm:pt-10">
        <ResultsSection state={state} pending={isPending} />
      </div>
    </form>
  );
}
