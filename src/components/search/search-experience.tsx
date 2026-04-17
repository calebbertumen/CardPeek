"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { pollCardSearchAction, searchCardStateAction, type SearchCardState } from "@/actions/search-card";
import { buildSearchQueryStringFromFields, type SearchPageFormDefaults } from "@/lib/search-url";
import { Button } from "@/components/ui/button";
import { CardSearchFields } from "@/components/search/card-search-fields";
import { searchBarWidthClassName } from "@/components/search/search-bar-layout";
import { SearchBarShell } from "@/components/search/search-bar-shell";
import { MarketDataUpdatingBanner } from "./market-data-updating-banner";
import { RefreshKick } from "./refresh-kick";
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
  if (state?.ok === false && state.code === "NO_DATA" && state.isRefreshing) {
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

type SearchFieldsSnapshot = {
  name: string;
  setName: string;
  cardNumber: string;
  condition: string;
};

function formDataFromSnapshot(s: SearchFieldsSnapshot): FormData {
  const fd = new FormData();
  fd.set("name", s.name);
  fd.set("setName", s.setName);
  fd.set("cardNumber", s.cardNumber);
  fd.set("condition", s.condition);
  return fd;
}

type SearchExperienceProps = {
  initialFormState: SearchCardState | null;
  formDefaults: SearchPageFormDefaults;
  viewerPlanId: "starter" | "collector";
  /** Logged-out: update `?name=` without `router.replace` so the server does not run another debited search. */
  syncSearchUrlWithHistoryOnly?: boolean;
};

export function SearchExperience({
  initialFormState,
  formDefaults,
  viewerPlanId,
  syncSearchUrlWithHistoryOnly = false,
}: SearchExperienceProps) {
  const router = useRouter();
  const [state, setState] = useState<SearchCardState | null>(initialFormState);
  const stateRef = useRef<SearchCardState | null>(initialFormState);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  /** Blocks duplicate form action invocations (e.g. React Strict Mode) from charging preview twice per click. */
  const submitGuardRef = useRef(false);
  /** Last URL-aligned or explicitly submitted search — background poll must not read live inputs while the user is typing. */
  const lastSubmittedSearchRef = useRef<SearchFieldsSnapshot>({
    name: formDefaults.name,
    setName: formDefaults.setName,
    cardNumber: formDefaults.cardNumber,
    condition: formDefaults.condition,
  });

  const initialFingerprint = useMemo(
    () => JSON.stringify(initialFormState, (_, v) => (v instanceof Date ? v.toISOString() : v)),
    [initialFormState],
  );

  useEffect(() => {
    setState(initialFormState);
    lastSubmittedSearchRef.current = {
      name: formDefaults.name,
      setName: formDefaults.setName,
      cardNumber: formDefaults.cardNumber,
      condition: formDefaults.condition,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only adopt server state when serialized payload changes (e.g. after router.refresh)
  }, [initialFingerprint]);

  stateRef.current = state;

  const kickEnabled =
    (state?.ok === true && state.data.isRefreshing) ||
    (state?.ok === false && state.code === "NO_DATA" && state.isRefreshing === true);

  const pollWhileRefreshing = useMemo(() => {
    if (!state) return false;
    if (state.ok) return state.data.isRefreshing;
    if (state.code === "NO_DATA") return state.isRefreshing === true;
    return false;
  }, [state]);

  useEffect(() => {
    if (!pollWhileRefreshing) return;
    const tick = () => {
      void pollCardSearchAction(formDataFromSnapshot(lastSubmittedSearchRef.current)).then((next) => {
        setState(next);
      });
    };
    const first = setTimeout(tick, 2000);
    const interval = setInterval(tick, 3000);
    const max = setTimeout(() => {
      clearInterval(interval);
    }, 120_000);
    return () => {
      clearTimeout(first);
      clearInterval(interval);
      clearTimeout(max);
    };
  }, [pollWhileRefreshing]);

  useEffect(() => {
    if (state?.ok === false && state.code === "VALIDATION") {
      formRef.current?.querySelector<HTMLInputElement>('input[name="name"]')?.focus();
    }
  }, [state]);

  return (
    <form
      ref={formRef}
      action={(formData) => {
        if (submitGuardRef.current) return;
        submitGuardRef.current = true;
        startTransition(() => {
          void (async () => {
            try {
              lastSubmittedSearchRef.current = {
                name: String(formData.get("name") ?? "").trim(),
                setName: String(formData.get("setName") ?? "").trim(),
                cardNumber: String(formData.get("cardNumber") ?? "").trim(),
                condition: String(formData.get("condition") ?? "raw_nm"),
              };
              const next = await searchCardStateAction(stateRef.current, formData);
              setState(next);
              const name = lastSubmittedSearchRef.current.name;
              if (name) {
                const qs = buildSearchQueryStringFromFields({
                  name,
                  setName: String(formData.get("setName") ?? ""),
                  cardNumber: String(formData.get("cardNumber") ?? ""),
                  condition: String(formData.get("condition") ?? "raw_nm"),
                });
                if (qs) {
                  if (syncSearchUrlWithHistoryOnly) {
                    window.history.replaceState(null, "", `/search?${qs}`);
                  } else {
                    router.replace(`/search?${qs}`, { scroll: false });
                  }
                }
              }
            } finally {
              submitGuardRef.current = false;
            }
          })();
        });
      }}
      className="flex w-full flex-col"
    >
      <RefreshKick enabled={kickEnabled} />
      {/* Search strip under the header; scrolls with the page (not sticky) */}
      <div className="w-full border-b border-border/60 bg-background/95 backdrop-blur-md">
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
                  ) : state.code === "NO_DATA" && state.isRefreshing ? (
                    <MarketDataUpdatingBanner className="mt-4" />
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
