// Product reads for the AI assistant's three tools. Same pattern as the other
// files in lib/data: typed functions, the cookie-based anon-key client, so row
// level security applies exactly as it does for any visitor. The assistant can
// only ever read what a visitor could read.
//
// Every row comes back in one slim shape (AiProductRow). The description is
// trimmed, because every character is paid for again on each later model call.
import { AI_LIMITS } from "@/lib/ai/config";
import { capText, cleanText } from "@/lib/ai/schemas";
import { cleanSearch } from "@/lib/data/products";
import { createServerSupabaseClient } from "@/lib/server";

export type AiProductRow = {
  id: string;
  name: string;
  slug: string;
  price: number; // whole rupees, straight from the products table
  category: string | null;
  description: string; // trimmed
};

const RESULT_LIMIT = 5;
const MAX_WORDS = 6;
// Filler words that would make the AND-of-words search match nothing.
const STOP_WORDS = new Set(["the", "for", "and", "with", "any", "you", "have"]);

type RawProduct = {
  id: string;
  name: string;
  slug: string;
  price: number | string;
  description: string | null;
  categories:
    { name: string; slug: string } | { name: string; slug: string }[] | null;
};

function shortDescription(value: string | null): string {
  return capText(cleanText(value ?? ""), AI_LIMITS.maxSimilarDescriptionChars);
}

function fromRaw(raw: RawProduct): AiProductRow {
  const category = Array.isArray(raw.categories)
    ? (raw.categories[0] ?? null)
    : raw.categories;
  return {
    id: raw.id,
    name: raw.name,
    slug: raw.slug,
    price: Number(raw.price),
    category: category?.name ?? null,
    description: shortDescription(raw.description),
  };
}

// The words of a search, safe to put inside a PostgREST filter string.
export function searchWords(query: string): string[] {
  return cleanSearch(query)
    .toLowerCase()
    .split(" ")
    .filter((word) => word.length >= 2 && !STOP_WORDS.has(word))
    .slice(0, MAX_WORDS);
}

export type SearchArgs = {
  query: string | null;
  categorySlug: string | null;
  maxPrice: number | null;
};

// Every word must appear in the name or the description (words are AND-ed,
// each word is name-OR-description). Newest first.
export async function searchProducts(
  args: SearchArgs,
): Promise<AiProductRow[]> {
  const supabase = await createServerSupabaseClient();

  let query = supabase
    .from("products")
    .select(
      args.categorySlug
        ? "id, name, slug, price, description, categories!inner(name, slug)"
        : "id, name, slug, price, description, categories(name, slug)",
    );

  if (args.categorySlug) query = query.eq("categories.slug", args.categorySlug);
  if (args.maxPrice !== null) query = query.lte("price", args.maxPrice);
  for (const word of searchWords(args.query ?? "")) {
    query = query.or(`name.ilike.%${word}%,description.ilike.%${word}%`);
  }

  const { data, error } = await query
    .order("created_at", { ascending: false })
    .order("id")
    .limit(RESULT_LIMIT);

  if (error) throw new Error(`searchProducts failed: ${error.message}`);
  return ((data ?? []) as unknown as RawProduct[]).map(fromRaw);
}

type MatchRow = {
  id: string;
  name: string;
  slug: string;
  price: number | string;
  description: string | null;
  category_name: string | null;
};

// "Find by meaning": the database compares the question's embedding with the
// stored product embeddings (match_products, phase-11-part-a.sql).
export async function matchProducts(
  embedding: number[],
): Promise<AiProductRow[]> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase.rpc("match_products", {
    query_embedding: embedding,
    match_count: RESULT_LIMIT,
  });

  if (error) throw new Error(`matchProducts failed: ${error.message}`);
  return ((data ?? []) as MatchRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    price: Number(row.price),
    category: row.category_name,
    description: shortDescription(row.description),
  }));
}

export async function getProductById(id: string): Promise<AiProductRow | null> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("products")
    .select("id, name, slug, price, description, categories(name, slug)")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`getProductById failed: ${error.message}`);
  return data ? fromRaw(data as unknown as RawProduct) : null;
}
