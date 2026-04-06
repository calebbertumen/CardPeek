import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/80 bg-surface-alt/30">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} CardPeek. Pokémon and related marks are trademarks of their respective owners.
        </p>
        <div className="flex flex-wrap gap-6 text-sm font-medium text-muted-foreground">
          <Link href="/legal/terms" className="transition-colors hover:text-foreground">
            Terms
          </Link>
          <Link href="/legal/privacy" className="transition-colors hover:text-foreground">
            Privacy
          </Link>
        </div>
      </div>
    </footer>
  );
}
