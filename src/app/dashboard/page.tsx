import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?callbackUrl=/dashboard");
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Signed in as <span className="font-medium text-foreground">{session.user.email}</span>
        </p>
      </div>

      <div className="mt-10 grid gap-6">
        <Card className="border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Recent searches</CardTitle>
            <CardDescription>
              Your search history will appear here in a future update.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              For now, jump back to search to run unlimited lookups.
            </p>
            <Button asChild className="mt-4 rounded-full">
              <Link href="/search">Go to search</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Saved searches</CardTitle>
            <CardDescription>Save comps you revisit often—coming soon.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="rounded-full">
              <Link href="/saved">View saved searches</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
