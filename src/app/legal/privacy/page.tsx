import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy policy",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">Privacy policy</h1>
      <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
        This is a placeholder privacy policy for the CardPeek MVP. Replace with a full policy that
        describes what you collect (accounts, anonymous IDs, usage), cookies, retention, subprocessors,
        and user rights.
      </p>
    </div>
  );
}
