import Image from "next/image";
import { Separator } from "@/components/ui/separator";
import type { CardMarketView } from "@/lib/market/card-market-view";
import { ListingCards } from "./listing-cards";
import { PricingSummary } from "./pricing-summary";
import { RefreshKick } from "./refresh-kick";
import { PriceAlertsPanel } from "./price-alerts-panel";
import type { AccessTier } from "@/lib/billing/access";

type Props = {
  data: CardMarketView;
  tier: AccessTier;
};

export function SearchResults({ data, tier }: Props) {
  return (
    <div className="mt-12 space-y-10">
      <RefreshKick enabled={data.isRefreshing} />
      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold tracking-tight">Results</h2>
        <p className="text-sm text-muted-foreground">
          Based on recent market sales. Updated periodically. Data may not reflect real-time listings.
        </p>
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
            {data.isRefreshing || data.isStale ? (
              <p className="mt-2 text-xs text-muted-foreground">
                {data.isRefreshing
                  ? "Refreshing market data (in background)."
                  : tier === "collector"
                    ? "Showing saved results while we refresh."
                    : "Showing recent market data; updates run periodically."}
              </p>
            ) : null}
          </div>
        </div>

        <div className="min-w-0 space-y-8">
          <PricingSummary data={data} tier={tier} />
          <PriceAlertsPanel tier={tier} cardId={data.card.id} />
        </div>
      </div>

      <Separator className="opacity-60" />

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Recent sold listings</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Stored from the latest market update for this card (not real-time).
          </p>
        </div>
        <ListingCards listings={data.listings} tier={tier} />
      </section>
    </div>
  );
}
