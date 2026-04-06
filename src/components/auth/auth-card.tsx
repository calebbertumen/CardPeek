import Link from "next/link";

export function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-[calc(100dvh-12rem)] max-w-md flex-col justify-center px-4 py-12 sm:px-6">
      <div className="mb-8 text-center">
        <Link href="/" className="text-lg font-semibold tracking-tight text-foreground">
          CardPeek
        </Link>
        {subtitle ? <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-lg shadow-black/35 sm:p-8">
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        <div className="mt-6">{children}</div>
      </div>
      {footer ? <div className="mt-8 text-center text-sm text-muted-foreground">{footer}</div> : null}
    </div>
  );
}
