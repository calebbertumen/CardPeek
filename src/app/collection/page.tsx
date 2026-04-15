import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getUserPlanId } from "@/lib/billing/get-user-plan";
import { formatUsd } from "@/lib/format";
import { formatTimeAgo } from "@/lib/time";
import { requireDbUser } from "@/lib/require-db-user";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getPricingForCollectionItem, getUserCollection } from "@/services/collection.service";
import { Info } from "lucide-react";
import { CollectionItemMenu } from "@/components/collection/collection-item-menu";

export const metadata: Metadata = {
  title: "Collection",
};

type CollectionItemRow = Awaited<ReturnType<typeof getUserCollection>>[number];

function conditionLabel(c: CollectionItemRow["condition"]): string {
  switch (c) {
    case "NM":
      return "NM";
    case "LP":
      return "LP";
    case "MP":
      return "MP";
    case "HP":
      return "HP";
    case "DMG":
      return "DMG";
    default:
      return String(c);
  }
}

async function mapInBatches<T, R>(items: T[], batchSize: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const res = await Promise.all(batch.map(fn));
    out.push(...res);
  }
  return out;
}

export default async function CollectionPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?callbackUrl=/collection");
  }

  const dbUser = await requireDbUser(session).catch(() => null);
  if (!dbUser) {
    redirect("/login?callbackUrl=/collection");
  }

  const tier = await getUserPlanId(dbUser.id);
  const rawItems: CollectionItemRow[] = await getUserCollection(dbUser.id);

  type GroupRow = {
    key: string;
    cardId: string;
    condition: CollectionItemRow["condition"];
    quantity: number;
    item: CollectionItemRow; // representative (most recent)
  };

  const groups: GroupRow[] = [];
  const groupByKey = new Map<string, GroupRow>();
  for (const it of rawItems) {
    const k = `${it.cardId}__${it.condition}`;
    const existing = groupByKey.get(k);
    if (existing) {
      existing.quantity += 1;
      continue;
    }
    const g: GroupRow = {
      key: k,
      cardId: it.cardId,
      condition: it.condition,
      quantity: 1,
      item: it,
    };
    groupByKey.set(k, g);
    groups.push(g);
  }

  const pricingKeyFor = (g: GroupRow) => g.key;

  // Avoid redundant pricing refresh queue checks when duplicates exist in the collection.
  const uniquePricingKeys = groups.map((g) => pricingKeyFor(g));

  const pricingByKey = new Map<string, Awaited<ReturnType<typeof getPricingForCollectionItem>>>();
  const uniquePricingResults = await mapInBatches(uniquePricingKeys, 10, async (k) => {
    const first = groups.find((g) => pricingKeyFor(g) === k)!.item;
    const p = await getPricingForCollectionItem({
      userId: dbUser.id,
      tier,
      item: {
        cardName: first.cardName,
        setName: first.setName,
        cardNumber: first.cardNumber,
        condition: first.condition,
      },
    });
    return { k, p };
  });
  for (const { k, p } of uniquePricingResults) {
    pricingByKey.set(k, p);
  }

  const pricing = groups.map((g) => pricingByKey.get(pricingKeyFor(g))!);

  const totalValue = (() => {
    let sum = 0;
    let any = false;
    for (let i = 0; i < groups.length; i += 1) {
      const p = pricing[i]?.price;
      if (typeof p === "number" && Number.isFinite(p)) {
        any = true;
        sum += p * groups[i]!.quantity;
      }
    }
    return any ? sum : null;
  })();

  const limitReached = tier === "starter" && rawItems.length >= 10;

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">Your Collection</h1>
          {tier === "starter" ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{rawItems.length}/10</span>
              <span>cards</span>
              <span className="group relative inline-flex">
                <button
                  type="button"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border bg-surface-alt/40 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  aria-label="Collection limit info"
                >
                  <Info className="h-4 w-4" aria-hidden />
                </button>
                <span
                  role="tooltip"
                  className="pointer-events-none absolute right-0 top-[calc(100%+8px)] z-[100] w-[240px] rounded-lg border border-border bg-popover px-3 py-2 text-xs leading-snug text-popover-foreground opacity-0 shadow-lg shadow-black/40 ring-1 ring-black/5 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
                >
                  Upgrade to <span className="font-medium">Collector</span> for unlimited adds to your collection.
                </span>
              </span>
            </div>
          ) : null}
        </div>
        <p className="text-sm text-muted-foreground">
          Saved cards reuse the same pricing cache as search.{" "}
          {tier === "starter" ? (
            <>
              Missing prices?{" "}
              <span className="text-foreground">Search the card</span> to generate pricing.
            </>
          ) : (
            <>
              Collector automatically refreshes stale snapshots when needed.
            </>
          )}
        </p>
      </div>

      {limitReached ? (
        <div className="mt-6 rounded-2xl border border-border/80 bg-surface-alt/30 px-5 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">You’ve reached your 10-card limit</p>
              <p className="text-sm text-muted-foreground">Upgrade to Collector for unlimited tracking.</p>
            </div>
            <div className="shrink-0">
              <Button asChild className="w-full rounded-full px-6 sm:w-auto">
                <Link href="/pricing">Upgrade to Collector</Link>
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,320px)_1fr] lg:items-start">
        <Card className="border-border/80 shadow-sm">
          <CardHeader className="space-y-1">
            <CardTitle className="text-lg">Total value</CardTitle>
            <CardDescription>
              Sum of available prices (cached). {tier === "starter" ? "Stale data may be included." : "Updates refresh automatically."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {totalValue == null ? (
              <p className="text-sm text-muted-foreground">—</p>
            ) : (
              <p className="text-3xl font-semibold tracking-tight text-[#10b981]">{formatUsd(totalValue)}</p>
            )}
            {totalValue == null && rawItems.length > 0 && tier === "starter" ? (
              <p className="mt-3 text-sm text-muted-foreground">
                No price data yet. Search these cards to generate pricing.
              </p>
            ) : null}
          </CardContent>
        </Card>

        <section className="space-y-4">
          {rawItems.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/80 bg-surface-alt/40 px-6 py-14 text-center">
              <p className="text-sm font-medium text-foreground">No cards in your collection yet</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Head to search and add a card to start tracking.
              </p>
              <div className="mt-5">
                <Button asChild className="rounded-full px-8">
                  <Link href="/search">Search cards</Link>
                </Button>
              </div>
            </div>
          ) : (
            <ul className="grid gap-4">
              {groups.map((g, idx) => {
                const item = g.item;
                const p = pricing[idx]!;
                return (
                  <li key={g.key}>
                    <Card className="overflow-hidden border-border/80 shadow-sm">
                      <CardContent className="relative p-4 sm:p-5">
                        <div className="absolute right-3 top-3 sm:right-4 sm:top-4">
                          <CollectionItemMenu cardId={g.cardId} condition={g.condition} quantity={g.quantity} />
                        </div>
                        <div className="flex gap-4">
                          <div className="relative h-24 w-[68px] shrink-0 overflow-hidden rounded-xl border border-border/70 bg-surface-alt/40">
                            <Image
                              src={item.imageUrl}
                              alt={`${item.cardName} card`}
                              fill
                              className="object-contain p-1"
                              sizes="68px"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="flex min-w-0 items-center gap-2">
                                  <p className="min-w-0 truncate text-base font-medium text-foreground">{item.cardName}</p>
                                  <Badge variant="secondary" className="shrink-0">
                                    {conditionLabel(item.condition)}
                                  </Badge>
                                  {g.quantity > 1 ? (
                                    <Badge variant="outline" className="shrink-0">
                                      x{g.quantity}
                                    </Badge>
                                  ) : null}
                                </div>
                                <p className="mt-0.5 text-sm text-muted-foreground">
                                  {item.setName ? item.setName : "—"}
                                  {item.cardNumber ? ` · #${item.cardNumber}` : ""}
                                </p>
                              </div>
                            </div>

                            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                              <div className="text-sm">
                                {p.price == null ? (
                                  <span className="text-muted-foreground">
                                    No price data yet.
                                    {tier === "starter" ? (
                                      <>
                                        {" "}
                                        <span className="text-muted-foreground">
                                          Search this card to generate pricing.
                                        </span>
                                      </>
                                    ) : null}
                                  </span>
                                ) : (
                                  <span className="font-semibold text-foreground">{formatUsd(p.price)}</span>
                                )}
                              </div>
                            </div>
                            <div className="mt-3 flex flex-col items-end gap-2 text-xs text-muted-foreground">
                              <div className="flex flex-wrap items-center justify-end gap-2">
                                {p.lastUpdated ? (
                                  <>
                                    <span>
                                      Last updated{" "}
                                      <span className="text-foreground">{formatTimeAgo(p.lastUpdated)}</span>
                                    </span>
                                    {p.isRefreshing ? (
                                      <span className="rounded-full border border-border/80 bg-surface-alt/40 px-2 py-0.5 text-[11px]">
                                        Refreshing…
                                      </span>
                                    ) : p.isStale ? (
                                      <span className="rounded-full border border-border/80 bg-surface-alt/40 px-2 py-0.5 text-[11px]">
                                        Stale
                                      </span>
                                    ) : null}
                                  </>
                                ) : (
                                  <span>Last updated —</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

