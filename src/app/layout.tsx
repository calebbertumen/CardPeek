import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: {
    default: "CardPeek — Pokémon sold comps",
    template: "%s · CardPeek",
  },
  description:
    "Search a Pokémon card and see recent sold listings with a clear pricing snapshot. Built for collectors who want fast, trustworthy comps.",
  /** SVG in /public; `app/favicon.ico` is served by Next without a metadata webpack route (fixes dev 500 on GET /favicon.ico). */
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn(inter.variable)}>
      <body className="min-h-dvh font-sans antialiased">
        <SiteHeader />
        <main className="min-h-[calc(100dvh-3.5rem)] sm:min-h-[calc(100dvh-4rem)]">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
