import Image from "next/image";
import { Separator } from "@/components/ui/separator";
import type { CardMarketView } from "@/lib/market/card-market-view";
import { buildEbaySoldListingsSearchUrl, resolveEbaySoldSearchKeywordForDisplay } from "@/lib/search/sold-search-query";
import { ListingCards } from "./listing-cards";
import { PricingSummary } from "./pricing-summary";
import type { AccessTier } from "@/lib/billing/access";
import { AddToCollectionMenu } from "@/components/collection/add-to-collection-menu";

type Props = {
  data: CardMarketView;
  tier: AccessTier;
};

export function SearchResults({ data, tier }: Props) {
  const resolvedEbayKeyword = resolveEbaySoldSearchKeywordForDisplay({
    storedKeyword: data.ebaySearchKeyword,
    name: data.card.name,
    setName: data.card.setName,
    cardNumber: data.card.cardNumber,
    conditionBucket: data.conditionBucket,
  });
  const ebaySoldSearchUrl = resolvedEbayKeyword
    ? buildEbaySoldListingsSearchUrl(resolvedEbayKeyword)
    : null;

  return (
    <div className="mt-12 space-y-10">
      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <h2 className="text-lg font-semibold tracking-tight">Results</h2>
          <div className="shrink-0 self-start sm:pt-0.5">
            <AddToCollectionMenu card={data.card} tier={tier} size="sm" />
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Based on recent market sales. Updated automatically when needed. Data may not reflect real-time listings.
        </p>
        {tier === "starter" && data.freeUpdatedLookups ? (
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">
              {data.freeUpdatedLookups.used} of {data.freeUpdatedLookups.limit}
            </span>{" "}
            fresh data updates used ·{" "}
            <span className="font-medium text-foreground">
              {data.freeUpdatedLookups.remaining}
            </span>{" "}
            remaining
          </p>
        ) : null}
      </div>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,280px)_1fr] lg:items-start lg:gap-12">
        <div className="mx-auto w-full max-w-[240px] space-y-4 lg:mx-0 lg:max-w-none">
          <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-lg shadow-black/35">
            <div className="relative aspect-[63/88] w-full bg-surface-alt">
              <Image
                src={data.card.imageLarge}
                alt={`${data.card.name} card`}
                fill
                className="object-contain p-2"
                sizes="(max-width: 1024px) 240px, 280px"
                priority
              />
            </div>
          </div>
          <div className="text-center lg:text-left">
            <h3 className="text-xl font-semibold tracking-tight">{data.card.name}</h3>
            {data.card.setName ? (
              <p className="mt-1 text-sm text-muted-foreground">{data.card.setName}</p>
            ) : null}
            {data.card.cardNumber ? (
              <p className="text-sm text-muted-foreground">#{data.card.cardNumber}</p>
            ) : null}
            {data.showFetchingBanner ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Showing your last saved snapshot until the update finishes.
              </p>
            ) : data.isStale ? (
              <p className="mt-2 text-xs text-muted-foreground">
                {tier === "collector"
                  ? "These numbers are from our last saved market snapshot for this card."
                  : "Showing cached market data. Updates refresh automatically when needed (typically within 24–72 hours)."}
              </p>
            ) : null}
          </div>
        </div>

        <div className="min-w-0 space-y-8">
          {data.lastScrapeError && data.isStale ? (
            <p className="rounded-xl border border-dashed border-border/80 bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
              Last update attempt failed. Showing the most recent saved estimate. You can try again after a refresh.
            </p>
          ) : null}
          <PricingSummary data={data} tier={tier} />
        </div>
      </div>

      <Separator className="opacity-60" />

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Recent sales</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Stored from the latest market update for this card (not real-time).
          </p>
        </div>
        <ListingCards
          listings={data.listings}
          listingsCount={data.listingsCount}
          tier={tier}
          ebaySoldSearchUrl={ebaySoldSearchUrl}
        />
      </section>
    </div>
  );
}
