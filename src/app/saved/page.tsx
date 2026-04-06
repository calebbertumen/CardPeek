import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Saved searches",
};

export default async function SavedSearchesPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?callbackUrl=/saved");
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Saved searches</h1>
      <p className="mt-2 text-muted-foreground">
        Bookmark cards and condition buckets you track often.
      </p>

      <Card className="mt-8 border-dashed border-border/80 bg-muted/10">
        <CardHeader>
          <CardTitle className="text-lg">Coming soon</CardTitle>
          <CardDescription>
            Saved searches will sync to your account. The database model is already stubbed for a fast
            follow-up.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline" className="rounded-full">
            <Link href="/search">Back to search</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
