import { NextResponse } from "next/server";
import fallbackSetNames from "@/data/pokemon-set-names-fallback.json";
import { fetchAllPokemonSetNames } from "@/services/pokemon-tcg/pokemon-tcg-sets";

/** Avoid static caching of a failed build; list is still CDN-cacheable via headers. */
export const dynamic = "force-dynamic";

/**
 * Cached list of official Pokémon TCG set names for the set-name combobox.
 * If the live API fails or returns nothing, we serve a bundled snapshot so the UI always has options.
 */
export async function GET() {
  const headers = {
    "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
  };

  try {
    const names = await fetchAllPokemonSetNames();
    if (names.length > 0) {
      return NextResponse.json({ names }, { headers });
    }
  } catch (e) {
    console.error("tcg-sets route", e);
  }

  const names = Array.isArray(fallbackSetNames)
    ? (fallbackSetNames as string[]).filter((n) => typeof n === "string" && n.trim())
    : [];
  return NextResponse.json({ names }, { headers });
}
