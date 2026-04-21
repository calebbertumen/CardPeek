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

  const staleOrFetching = data.showFetchingBanner ? (
    <p className="mt-2 text-xs leading-snug text-muted-foreground">
      Showing your last saved snapshot until the update finishes.
    </p>
  ) : data.isStale ? (
    <p className="mt-2 text-xs leading-snug text-muted-foreground">
      {tier === "collector"
        ? "Numbers from our last saved snapshot for this card."
        : "Cached data. Refreshes automatically when needed (often within a few days)."}
    </p>
  ) : null;

  const identityBlock = (
    <>
      <h3 className="text-xl font-semibold leading-tight tracking-tight">{data.card.name}</h3>
      {data.card.setName ? (
        <p className="mt-1 text-sm leading-snug text-muted-foreground">{data.card.setName}</p>
      ) : null}
      {data.card.cardNumber ? (
        <p className="text-sm leading-snug text-muted-foreground">#{data.card.cardNumber}</p>
      ) : null}
      <div className="hidden lg:block">{staleOrFetching}</div>
    </>
  );

  return (
    <div className="mt-8 space-y-6 lg:mt-12 lg:space-y-10">
      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <h2 className="text-lg font-semibold tracking-tight">Results</h2>
          <div className="hidden shrink-0 lg:block lg:pt-0.5">
            <AddToCollectionMenu card={data.card} tier={tier} size="sm" />
          </div>
        </div>
        <p className="hidden text-sm text-muted-foreground sm:block">
          Recent eBay sold results, summarized for a quicker buy/sell read than digging through listings yourself.
        </p>
        <p className="text-xs leading-snug text-muted-foreground sm:hidden">
          Real recent eBay <span className="font-medium text-foreground">sold</span> prices summarized, not active
          listings.
        </p>
        {tier === "starter" && data.freeUpdatedLookups ? (
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">
              {data.freeUpdatedLookups.used} of {data.freeUpdatedLookups.limit}
            </span>{" "}
            fresh data updates ·{" "}
            <span className="font-medium text-foreground">{data.freeUpdatedLookups.remaining}</span> left
          </p>
        ) : null}
      </div>

      {/* One column on mobile: card visual + title stacked tight, then pricing. Desktop: two columns, no row-span stretch. */}
      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,280px)_1fr] lg:items-start lg:gap-x-12 lg:gap-y-0">
        <div className="flex min-w-0 flex-col gap-3 text-center lg:text-left">
          <div className="mx-auto w-[min(100%,9.5rem)] shrink-0 lg:mx-0 lg:w-full lg:max-w-[240px]">
            <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-lg shadow-black/35">
              <div className="relative aspect-[63/88] w-full bg-surface-alt">
                <Image
                  src={data.card.imageLarge}
                  alt={`${data.card.name} card`}
                  fill
                  className="object-contain p-1.5 lg:p-2"
                  sizes="(max-width: 1024px) 152px, 280px"
                  priority
                />
              </div>
            </div>
          </div>
          <div className="min-w-0">{identityBlock}</div>
          <div className="lg:hidden">{staleOrFetching}</div>
        </div>

        <div className="min-w-0 lg:min-h-0">
          {data.lastScrapeError && data.isStale ? (
            <p className="mb-3 rounded-xl border border-dashed border-border/80 bg-muted/20 px-3 py-2.5 text-xs leading-snug text-muted-foreground lg:px-4 lg:py-3">
              Last update failed. Showing the most recent saved estimate.
            </p>
          ) : null}
          <PricingSummary data={data} tier={tier} />
          <div className="mt-4 lg:hidden">
            <AddToCollectionMenu
              className="[&_button]:h-11 [&_button]:min-h-11 [&_button]:w-full [&_button]:justify-center"
              card={data.card}
              tier={tier}
              size="sm"
            />
          </div>
        </div>
      </div>

      <Separator className="opacity-60" />

      <section className="space-y-3 lg:space-y-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Recent sales</h2>
          <p className="mt-1 text-xs leading-snug text-muted-foreground lg:text-sm">
            From the latest saved snapshot (not live-scraped on every view).
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
