/**
 * Pokémon TCG API v2 — https://docs.pokemontcg.io/
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
