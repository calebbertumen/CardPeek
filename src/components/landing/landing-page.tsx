import type { ReactNode } from "react";
import { BarChart3, Layers, Search, Star } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { LandingSearchSectionServer } from "@/components/search/landing-search-section-server";
import { searchBarWidthClassName } from "@/components/search/search-bar-layout";
import { cn } from "@/lib/utils";

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
          <div className="grid items-center gap-12 lg:gap-16">
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
