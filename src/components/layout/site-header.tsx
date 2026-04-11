import Link from "next/link";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { signOutAction } from "@/actions/sign-out";

export async function SiteHeader() {
  const session = await auth();

  return (
    <header className="sticky top-0 z-50 border-b border-border/80 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:h-16 sm:gap-4 sm:px-6">
        <Link href="/" className="shrink-0 text-lg font-semibold tracking-tight text-foreground">
          CardPeek
        </Link>

        <nav className="flex flex-1 items-center justify-end gap-2 sm:gap-3 md:gap-8">
          <Link
            href="/pricing"
            className="hidden text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:inline"
          >
            Pricing
          </Link>
          <Link
            href="/pricing"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:hidden"
          >
            Plans
          </Link>
          {session?.user ? (
            <>
              <Link
                href="/dashboard"
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Dashboard
              </Link>
              <form action={signOutAction} className="inline shrink-0">
                <Button type="submit" variant="ghost" size="sm" className="hidden md:inline-flex">
                  Sign out
                </Button>
                <Button
                  type="submit"
                  variant="outline"
                  size="sm"
                  className="shrink-0 whitespace-nowrap px-2.5 text-xs sm:px-3 sm:text-sm md:hidden"
                >
                  Sign out
                </Button>
              </form>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Login
              </Link>
              <Button asChild size="sm" className="rounded-full px-4 shadow-sm sm:px-5">
                <Link href="/register">Get Started</Link>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
