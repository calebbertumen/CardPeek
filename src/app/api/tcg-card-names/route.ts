import { NextResponse } from "next/server";
import { fetchPokemonCardNameSuggestions } from "@/services/pokemon-tcg/pokemon-tcg.service";

/**
 * Autocomplete for card name field  -  distinct Pokémon TCG card names matching the typed prefix.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  if (q.length < 1) {
    return NextResponse.json(
      { names: [] },
      {
        headers: {
          // Cheap to compute but avoid hammering on rapid focus/blur.
          "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
        },
      },
    );
  }
  const names = await fetchPokemonCardNameSuggestions(q);
  return NextResponse.json(
    { names },
    {
      headers: {
        // Cache at the edge/server to keep keystroke-to-dropdown latency low.
        // (This endpoint is not user-specific.)
        "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
      },
    },
  );
}
