import type { Metadata } from "next";
import { searchFromUrlParams } from "@/actions/search-card";
import { searchDefaultsFromUrlParams } from "@/lib/search-url";
import { SearchExperience } from "@/components/search/search-experience";
import { auth } from "@/lib/auth";
import { getUserPlanId } from "@/lib/billing/get-user-plan";

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
  const viewerPlanId = await getUserPlanId(session?.user?.id);
  const experienceKey =
    [formDefaults.name, formDefaults.setName, formDefaults.cardNumber, formDefaults.condition].join("\0") ||
    "__empty__";

  return (
    <SearchExperience
      key={experienceKey}
      initialFormState={initialFormState}
      formDefaults={formDefaults}
      viewerPlanId={viewerPlanId}
    />
  );
}
