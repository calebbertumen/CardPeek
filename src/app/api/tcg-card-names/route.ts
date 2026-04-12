import { NextResponse } from "next/server";
import { fetchPokemonCardNameSuggestions } from "@/services/pokemon-tcg/pokemon-tcg.service";

/**
 * Autocomplete for card name field — distinct Pokémon TCG card names matching the typed prefix.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  if (q.length < 1) {
    return NextResponse.json({ names: [] }, { headers: { "Cache-Control": "no-store" } });
  }
  const names = await fetchPokemonCardNameSuggestions(q);
  return NextResponse.json({ names }, { headers: { "Cache-Control": "no-store" } });
}
