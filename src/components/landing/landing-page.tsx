import type { ReactNode } from "react";
import Image from "next/image";
import { BarChart3, Layers, Search, Star } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { LandingSearchSectionServer } from "@/components/search/landing-search-section-server";
import { searchBarWidthClassName } from "@/components/search/search-bar-layout";
import { cn } from "@/lib/utils";

const PREVIEW_IMG = "https://images.pokemontcg.io/base1/4_hires.png";

export function LandingPage() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-border bg-background">
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary/[0.07] via-transparent to-transparent"
          aria-hidden
        />
        <div className={cn("relative z-10 pt-6 pb-8 sm:pt-8 sm:pb-10", searchBarWidthClassName)}>
          <LandingSearchSectionServer />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-4 sm:px-6 sm:pb-20 sm:pt-6 lg:pb-28 lg:pt-8">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <div className="space-y-8 text-center lg:text-left">
              <p className="text-sm font-medium text-primary">Recent sales, simplified</p>
              <h1 className="text-balance text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-[3.25rem] lg:leading-[1.1]">
                Check recent sold prices in seconds
              </h1>
              <div className="mx-auto max-w-xl space-y-2 text-muted-foreground lg:mx-0">
                <p className="text-lg">
                  Built from recent sold listings, CardPeek gives you a cleaner pricing snapshot without scrolling
                  through raw sold results.
                </p>
                <p className="text-sm">
                  Free gives you the snapshot. Collector lets you see the sold listings behind it.
                </p>
              </div>
            </div>

            <HeroProductPreview />
          </div>
        </div>
      </section>

      <section className="border-b border-border/60 bg-background py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <BenefitCard
              icon={<BarChart3 className="h-5 w-5" aria-hidden />}
              title="Recent sold listings"
              body="See recent sales for your card in a cleaner, easier-to-scan view."
            />
            <BenefitCard
              icon={<Layers className="h-5 w-5" aria-hidden />}
              title="Fast pricing snapshot"
              body="Get an estimate and range from recent sold listings, then check the comps behind it."
            />
            <BenefitCard
              icon={<Search className="h-5 w-5" aria-hidden />}
              title="Cleaner card search"
              body="Search by name, set, number, and condition for a more precise match."
            />
            <BenefitCard
              icon={<Star className="h-5 w-5" aria-hidden />}
              title="Track your collection"
              body="Save cards and revisit pricing snapshots in one place."
            />
          </div>
        </div>
      </section>
    </>
  );
}

function HeroProductPreview() {
  return (
    <Card className="relative overflow-hidden border-border/80 bg-card shadow-xl shadow-black/40">
      <CardContent className="p-0">
        <div className="flex flex-col sm:flex-row">
          <div className="relative w-full border-b border-border/60 bg-surface-alt p-6 sm:w-[42%] sm:border-b-0 sm:border-r sm:border-border/60">
            <div className="relative mx-auto aspect-[63/88] w-full max-w-[200px]">
              <Image
                src={PREVIEW_IMG}
                alt="Sample Pokémon card preview"
                fill
                className="rounded-lg object-contain drop-shadow-md"
                sizes="200px"
                priority
              />
            </div>
            <p className="mt-4 text-center text-sm font-medium text-foreground">Charizard · Base Set</p>
            <p className="text-center text-xs text-muted-foreground">Illustrative preview</p>
          </div>
          <div className="flex flex-1 flex-col gap-4 p-6">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Estimated value</p>
              <p className="mt-1 text-3xl font-semibold tracking-tight text-primary">$312.40</p>
              <p className="mt-1 text-xs text-muted-foreground">Based on 5 recent listings · Raw NM</p>
            </div>
            <div className="space-y-2 rounded-xl border border-border/50 bg-surface-alt/80 p-3">
              <p className="text-xs font-medium text-muted-foreground">Recent sales used</p>
              {[318, 305, 299, 322, 308].map((p, i) => (
                <div
                  key={p}
                  className="flex items-center justify-between rounded-lg border border-border/40 bg-card px-3 py-2 text-sm"
                >
                  <span className="truncate text-muted-foreground">Sold listing</span>
                  <span className="shrink-0 font-medium text-primary">${p}.00</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function BenefitCard({
  icon,
  title,
  body,
}: {
  icon: ReactNode;
  title: string;
  body: string;
}) {
  return (
    <Card className="border-border/80 bg-card shadow-sm shadow-black/20">
      <CardContent className="p-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          {icon}
        </div>
        <h3 className="mt-4 font-semibold tracking-tight">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
      </CardContent>
    </Card>
  );
}
