/**
 * Pokémon TCG API v2  -  list all sets (names for search combobox).
 * https://docs.pokemontcg.io/api-reference/sets/search-sets/
 */

const SETS_PAGE_SIZE = 250;
/** Cap pages so a slow/unreachable API cannot hang the `/api/tcg-sets` route indefinitely. */
const MAX_PAGES = 6;
/** Per-request timeout so a single stalled TCP connection does not block the UI forever. */
const FETCH_TIMEOUT_MS = 12_000;

type SetsPageJson = {
  data: Array<{ name: string }>;
  page: number;
  pageSize: number;
  count: number;
  totalCount: number;
};

function tcgHeaders(): HeadersInit {
  const headers: HeadersInit = { Accept: "application/json" };
  const key = process.env.POKEMON_TCG_API_KEY;
  if (key) (headers as Record<string, string>)["X-Api-Key"] = key;
  return headers;
}

async function fetchSetsPage(page: number): Promise<SetsPageJson> {
  const url = `https://api.pokemontcg.io/v2/sets?page=${page}&pageSize=${SETS_PAGE_SIZE}`;
  const res = await fetch(url, {
    headers: tcgHeaders(),
    next: { revalidate: 86_400 },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) {
    throw new Error(`Pokemon TCG sets API ${res.status}`);
  }
  return (await res.json()) as SetsPageJson;
}

/** Unique set names, sorted for display (API `name` is the human-readable set title). */
export async function fetchAllPokemonSetNames(): Promise<string[]> {
  const names: string[] = [];

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    try {
      const json = await fetchSetsPage(page);
      const chunk = json.data ?? [];
      for (const row of chunk) {
        if (row.name?.trim()) names.push(row.name.trim());
      }
      const total = json.totalCount ?? 0;
      if (chunk.length === 0 || chunk.length < SETS_PAGE_SIZE || names.length >= total) {
        break;
      }
    } catch {
      // Return partial list if a later page times out; rethrow only if we have nothing.
      if (names.length > 0) break;
      throw new Error("Pokemon TCG sets fetch failed");
    }
  }

  const unique = Array.from(new Set(names));
  unique.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  return unique;
}
