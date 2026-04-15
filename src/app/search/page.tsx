import type { Metadata } from "next";
import { searchFromUrlParams } from "@/actions/search-card";
import { searchDefaultsFromUrlParams } from "@/lib/search-url";
import { SearchExperience } from "@/components/search/search-experience";
import { auth } from "@/lib/auth";
import { getUserPlanIdForSession } from "@/lib/billing/get-user-plan";

/** Inline Apify sold scrape + poll can exceed the default serverless limit; required on Vercel for slow/queued runs. */
export const maxDuration = 300;

export const metadata: Metadata = {
  title: "Search",
  description: "Look up a Pokémon card and view recent sold listings with pricing context.",
};

type SearchPageProps = {
  searchParams: Record<string, string | string[] | undefined>;
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const formDefaults = searchDefaultsFromUrlParams(searchParams);
  const initialFormState = await searchFromUrlParams(searchParams);
  const session = await auth();
  const viewerPlanId = await getUserPlanIdForSession(session);
  /** Avoid a second server search (and double preview debit) when the client updates the query string after submit. */
  const syncSearchUrlWithHistoryOnly = !session?.user;
  const experienceKey =
    [formDefaults.name, formDefaults.setName, formDefaults.cardNumber, formDefaults.condition].join("\0") ||
    "__empty__";

  return (
    <SearchExperience
      key={experienceKey}
      initialFormState={initialFormState}
      formDefaults={formDefaults}
      viewerPlanId={viewerPlanId}
      syncSearchUrlWithHistoryOnly={syncSearchUrlWithHistoryOnly}
    />
  );
}
