import { auth } from "@/lib/auth";
import { getUserPlanId } from "@/lib/billing/get-user-plan";
import { LandingSearchSection } from "@/components/search/landing-search-section";

export async function LandingSearchSectionServer(props: { shellClassName?: string }) {
  const session = await auth();
  const planId = await getUserPlanId(session?.user?.id);
  return <LandingSearchSection shellClassName={props.shellClassName} viewerPlanId={planId} />;
}

