/**
 * Pokémon TCG API v2  -  https://docs.pokemontcg.io/
 * Optional header: X-Api-Key: process.env.POKEMON_TCG_API_KEY
 * Structured for future multi-TCG providers behind a shared interface.
 */

export type PokemonTcgCardDTO = {
  id: string;
  name: string;
  number?: string;
  set?: { name?: string };
  images: { small: string; large: string };
};

function escapeQueryPart(s: string): string {
  return s.replace(/"/g, '\\"').trim();
}

/** Escape user input for a Lucene prefix wildcard (`name:prefix*`). */
function escapeLucenePrefix(s: string): string {
  const t = s.trim();
  return t.replace(/\\/g, "\\\\").replace(/([+\-&|!(){}\[\]^"~*?:/])/g, "\\$1");
}

const MAX_NAME_SUGGESTIONS = 5;
/** Card rows per request  -  many prints share the same name, so we paginate until we have enough distinct names. */
const NAME_SUGGEST_PAGE_SIZE = 100;
const NAME_SUGGEST_MAX_PAGES = 12;

type NameSuggestCacheEntry = { names: string[]; expiresAt: number };
const NAME_SUGGEST_CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

function getNameSuggestCaches(): {
  cache: Map<string, NameSuggestCacheEntry>;
  inFlight: Map<string, Promise<string[]>>;
} {
  const g = globalThis as unknown as {
    __cardpeek_nameSuggestCache?: Map<string, NameSuggestCacheEntry>;
    __cardpeek_nameSuggestInFlight?: Map<string, Promise<string[]>>;
  };
  if (!g.__cardpeek_nameSuggestCache) g.__cardpeek_nameSuggestCache = new Map();
  if (!g.__cardpeek_nameSuggestInFlight) g.__cardpeek_nameSuggestInFlight = new Map();
  return { cache: g.__cardpeek_nameSuggestCache, inFlight: g.__cardpeek_nameSuggestInFlight };
}

/**
 * Distinct card names that start with `prefix` (Pokémon TCG API v2 Lucene `name:prefix*`).
 *
 * A single page of results is mostly duplicate names (same Pokémon, many sets). We paginate and do not use
 * `orderBy=name`, which would return every print of "Charcadet" before any "Charmander" row.
 */
export async function fetchPokemonCardNameSuggestions(prefix: string): Promise<string[]> {
  const raw = prefix.trim();
  // 1-char prefixes create huge result sets and slow, multi-page scans. Start at 2 chars for responsiveness.
  if (raw.length < 2 || raw.length > 64) return [];

  const keyLower = raw.toLowerCase();
  const { cache, inFlight } = getNameSuggestCaches();
  const cached = cache.get(keyLower);
  if (cached && cached.expiresAt > Date.now()) return cached.names;

  const existingPromise = inFlight.get(keyLower);
  if (existingPromise) return existingPromise;

  const promise = (async (): Promise<string[]> => {
    const q = `name:${escapeLucenePrefix(raw)}*`;
    const lower = raw.toLowerCase();
    const seen = new Set<string>();
    const names: string[] = [];

    const headers: HeadersInit = { Accept: "application/json" };
    const key = process.env.POKEMON_TCG_API_KEY;
    if (key) (headers as Record<string, string>)["X-Api-Key"] = key;

    // Timebox suggestion lookups so keystrokes stay snappy. We'll often satisfy from cache on the next keypress.
    const deadlineMs = Date.now() + 900;

    for (let page = 1; page <= NAME_SUGGEST_MAX_PAGES && names.length < MAX_NAME_SUGGESTIONS; page++) {
      if (Date.now() > deadlineMs) break;
      const url = `https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(q)}&pageSize=${NAME_SUGGEST_PAGE_SIZE}&page=${page}`;

      const res = await fetch(url, { headers, next: { revalidate: 0 } });
      if (!res.ok) {
        break;
      }

      const json = (await res.json()) as { data?: PokemonTcgCardDTO[] };
      const list = json.data ?? [];
      if (list.length === 0) break;

      for (const card of list) {
        const n = card.name?.trim();
        if (!n) continue;
        const nk = n.toLowerCase();
        if (!nk.startsWith(lower)) continue;
        if (seen.has(nk)) continue;
        seen.add(nk);
        names.push(n);
        if (names.length >= MAX_NAME_SUGGESTIONS) break;
      }

      if (list.length < NAME_SUGGEST_PAGE_SIZE) break;
    }

    const out = names.sort((a, b) => a.localeCompare(b));
    cache.set(keyLower, { names: out, expiresAt: Date.now() + NAME_SUGGEST_CACHE_TTL_MS });
    return out;
  })().finally(() => {
    inFlight.delete(keyLower);
  });

  inFlight.set(keyLower, promise);
  return promise;
}

function buildQuery(name: string, setName?: string | null, cardNumber?: string | null): string {
  const parts: string[] = [`name:"${escapeQueryPart(name)}"`];
  if (setName?.trim()) {
    parts.push(`set.name:"${escapeQueryPart(setName)}"`);
  }
  if (cardNumber?.trim()) {
    parts.push(`number:"${escapeQueryPart(cardNumber)}"`);
  }
  return parts.join(" ");
}

export async function fetchPokemonCardBestMatch(input: {
  name: string;
  setName?: string | null;
  cardNumber?: string | null;
}): Promise<PokemonTcgCardDTO | null> {
  const q = buildQuery(input.name, input.setName, input.cardNumber);
  const url = `https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(q)}&pageSize=8`;

  const headers: HeadersInit = { Accept: "application/json" };
  const key = process.env.POKEMON_TCG_API_KEY;
  if (key) (headers as Record<string, string>)["X-Api-Key"] = key;

  const res = await fetch(url, { headers, next: { revalidate: 0 } });
  if (!res.ok) {
    console.error("Pokemon TCG API error", res.status, await res.text().catch(() => ""));
    return null;
  }

  const json = (await res.json()) as { data?: PokemonTcgCardDTO[] };
  const list = json.data ?? [];
  if (list.length === 0 && input.setName?.trim()) {
    return fetchPokemonCardBestMatch({ name: input.name, cardNumber: input.cardNumber });
  }
  if (list.length === 0) return null;

  const exactNumber = input.cardNumber?.trim().toLowerCase();
  if (exactNumber) {
    const byNum = list.find((c) => c.number?.toLowerCase() === exactNumber);
    if (byNum) return byNum;
  }
  return list[0] ?? null;
}
