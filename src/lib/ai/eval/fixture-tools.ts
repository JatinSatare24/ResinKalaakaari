// The assistant's three tools, backed by the fake catalogue instead of the
// database. Search works like the real one (every word must appear, price cap,
// category). "Find by meaning" compares embeddings in memory.
import { cosine } from "@/lib/ai/mock-provider";
import { categorySlug, searchTextOf } from "@/lib/ai/eval/catalogue";
import type { ToolDeps } from "@/lib/ai/tools";
import type { AiProductRow } from "@/lib/data/ai-products";

const STOP_WORDS = new Set(["the", "for", "and", "with", "any", "you", "have"]);

export function createFixtureTools(
  catalogue: AiProductRow[],
  embed: (texts: string[]) => Promise<number[][]>,
  vectors: Map<string, number[]>,
): ToolDeps {
  return {
    async searchProducts({ query, categorySlug: slug, maxPrice }) {
      const words = (query ?? "")
        .toLowerCase()
        .replace(/[^a-z0-9 ]+/g, " ")
        .split(/\s+/)
        .filter((w) => w.length >= 2 && !STOP_WORDS.has(w))
        .slice(0, 6);
      return catalogue
        .filter((row) => slug === null || categorySlug(row) === slug)
        .filter((row) => maxPrice === null || row.price <= maxPrice)
        .filter((row) =>
          words.every((w) => searchTextOf(row).toLowerCase().includes(w)),
        )
        .slice(0, 5);
    },
    async matchProducts(embedding) {
      return [...catalogue]
        .sort(
          (a, b) =>
            cosine(vectors.get(b.id) ?? [], embedding) -
            cosine(vectors.get(a.id) ?? [], embedding),
        )
        .slice(0, 5);
    },
    async getProductById(id) {
      return catalogue.find((row) => row.id === id) ?? null;
    },
    async embed(text) {
      return (await embed([text]))[0];
    },
  };
}

// Embeds every catalogue row once, up front.
export async function embedCatalogue(
  catalogue: AiProductRow[],
  embed: (texts: string[]) => Promise<number[][]>,
): Promise<Map<string, number[]>> {
  const vectors = await embed(catalogue.map(searchTextOf));
  return new Map(catalogue.map((row, i) => [row.id, vectors[i]]));
}
