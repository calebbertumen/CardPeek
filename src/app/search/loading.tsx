import { SearchResultsSkeleton } from "@/components/search/search-results-skeleton";
import { SearchBarLoading } from "@/components/search/search-bar-loading";

/**
 * Shown while the /search RSC runs (including server-side search + sold scrape wait).
 * Covers navigations from the home page “See results” flow.
 */
export default function SearchLoading() {
  return (
    <>
      <SearchBarLoading />

      <div className="mx-auto w-full max-w-5xl px-4 pb-10 pt-8 sm:px-6 sm:pb-14 sm:pt-10">
        <SearchResultsSkeleton />
      </div>
    </>
  );
}
