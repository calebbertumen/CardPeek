import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/80 bg-surface-alt/30">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
          © {new Date().getFullYear()} CardPeek. CardPeek is not affiliated with, endorsed by, or sponsored by
          Pokémon or any related trademark holders. Pokémon and all related marks are trademarks of their respective
          owners.
        </p>
        <div className="flex flex-wrap gap-6 text-sm font-medium text-muted-foreground">
          <Link href="/legal/privacy" className="transition-colors hover:text-foreground">
            Privacy policy
          </Link>
          <Link href="/legal/terms" className="transition-colors hover:text-foreground">
            Terms of service
          </Link>
          <Link href="/legal/refund-policy" className="transition-colors hover:text-foreground">
            Refund policy
          </Link>
        </div>
      </div>
    </footer>
  );
}
