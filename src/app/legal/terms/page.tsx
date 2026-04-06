import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of service",
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">Terms of service</h1>
      <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
        This is a placeholder terms page for the CardPeek MVP. Before a public launch, replace this
        content with counsel-reviewed terms covering acceptable use, data sources, disclaimers, and
        limitation of liability.
      </p>
    </div>
  );
}
