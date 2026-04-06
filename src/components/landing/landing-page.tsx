import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { BarChart3, Layers, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
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
              <p className="text-sm font-medium text-primary">Sold comps, simplified</p>
              <h1 className="text-balance text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-[3.25rem] lg:leading-[1.1]">
                Know what your card is worth in seconds
              </h1>
              <p className="mx-auto max-w-xl text-lg text-muted-foreground lg:mx-0">
                CardPeek shows recent sold listings and turns them into a simple, easy-to-read pricing snapshot.
              </p>
            </div>

            <HeroProductPreview />
          </div>
        </div>
      </section>

      <section className="border-b border-border/60 bg-background py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-6 sm:grid-cols-3">
            <BenefitCard
              icon={<BarChart3 className="h-5 w-5" aria-hidden />}
              title="Recent sold comps"
              body="See the latest sales that match your card and condition—no clutter, no noise."
            />
            <BenefitCard
              icon={<Layers className="h-5 w-5" aria-hidden />}
              title="Fast pricing snapshot"
              body="Average, median, and range calculated from the exact listings we show you."
            />
            <BenefitCard
              icon={<Search className="h-5 w-5" aria-hidden />}
              title="Clean card-level search"
              body="Name, set, number, and condition bucket—structured for serious buying decisions."
            />
          </div>
        </div>
      </section>

      <section id="how" className="scroll-mt-20 bg-surface-alt/25 py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">How it works</h2>
            <p className="mt-3 text-muted-foreground">
              Three quick steps from search to confident pricing context.
            </p>
          </div>
          <ol className="mx-auto mt-12 grid max-w-4xl list-none gap-8 sm:grid-cols-3">
            <Step n={1} title="Search the card" body="Enter name, optional set and number, and pick a condition bucket." />
            <Step n={2} title="View recent solds" body="We show up to five recent sold listings matched to that bucket." />
            <Step n={3} title="Get pricing context" body="See average, median, range, and when the data was last refreshed." />
          </ol>
          <div className="mt-12 flex justify-center">
            <Button asChild size="lg" className="h-12 rounded-full px-10 shadow-sm">
              <Link href="#search">Try a search</Link>
            </Button>
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
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Average sold</p>
              <p className="mt-1 text-3xl font-semibold tracking-tight text-primary">$312.40</p>
              <p className="mt-1 text-xs text-muted-foreground">Based on 5 recent listings · Raw NM</p>
            </div>
            <div className="space-y-2 rounded-xl border border-border/50 bg-surface-alt/80 p-3">
              <p className="text-xs font-medium text-muted-foreground">Recent sold</p>
              {[318, 305, 299, 322, 308].map((p, i) => (
                <div
                  key={p}
                  className="flex items-center justify-between rounded-lg border border-border/40 bg-card px-3 py-2 text-sm"
                >
                  <span className="truncate text-muted-foreground">Listing {i + 1}</span>
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

function Step({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <li className="text-center sm:text-left">
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground sm:mx-0">
        {n}
      </div>
      <h3 className="mt-4 font-semibold tracking-tight">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
    </li>
  );
}
