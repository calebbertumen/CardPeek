import { SearchResultsSkeleton } from "@/components/search/search-results-skeleton";
import { searchBarWidthClassName } from "@/components/search/search-bar-layout";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Shown while the /search RSC runs (including server-side search + sold scrape wait).
 * Covers navigations from the home page “See results” flow.
 */
export default function SearchLoading() {
  return (
    <>
      <div className="sticky top-14 z-30 w-full border-b border-border/60 bg-background/95 backdrop-blur-md sm:top-16">
        <div className="w-full py-4 sm:py-5">
          <div className={searchBarWidthClassName}>
            <Skeleton className="h-[4.5rem] w-full rounded-2xl sm:h-12" aria-hidden />
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-5xl px-4 pb-10 pt-8 sm:px-6 sm:pb-14 sm:pt-10">
        <div className="mb-6 space-y-2 text-center sm:text-left">
          <Skeleton className="mx-auto h-8 w-48 sm:mx-0" />
          <Skeleton className="mx-auto h-4 w-full max-w-2xl sm:mx-0" />
        </div>
        <p className="mb-2 text-center text-sm text-muted-foreground sm:text-left" aria-live="polite">
          Loading market data…
        </p>
        <SearchResultsSkeleton className="mt-6" />
      </div>
    </>
  );
}
