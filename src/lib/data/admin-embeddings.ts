// The admin-only side of the product search index. Same two-lock pattern as
// admin-products.ts: the action checks the role first, and the SQL functions
// (phase-11-part-a.sql) check is_admin() again. The embeddings table itself
// has no policies at all, so nothing but these functions can touch it.
import { createServerSupabaseClient } from "@/lib/server";

export type EmbedProduct = {
  id: string;
  name: string;
  categoryName: string | null;
  description: string | null;
};

type RawProduct = {
  id: string;
  name: string;
  description: string | null;
  categories: { name: string } | { name: string }[] | null;
};

function fromRaw(raw: RawProduct): EmbedProduct {
  const category = Array.isArray(raw.categories)
    ? (raw.categories[0] ?? null)
    : raw.categories;
  return {
    id: raw.id,
    name: raw.name,
    categoryName: category?.name ?? null,
    description: raw.description,
  };
}

const COLUMNS = "id, name, description, categories(name)";

export async function getEmbedProduct(
  id: string,
): Promise<EmbedProduct | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("products")
    .select(COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`getEmbedProduct failed: ${error.message}`);
  return data ? fromRaw(data as unknown as RawProduct) : null;
}

export async function listEmbedProducts(): Promise<EmbedProduct[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("products")
    .select(COLUMNS)
    .order("id");
  if (error) throw new Error(`listEmbedProducts failed: ${error.message}`);
  return ((data ?? []) as unknown as RawProduct[]).map(fromRaw);
}

// product id -> hash of the text its stored embedding was made from.
export async function listEmbeddingHashes(): Promise<Map<string, string>> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("admin_get_embedding_hashes");
  if (error) throw new Error(`listEmbeddingHashes failed: ${error.message}`);
  const hashes = new Map<string, string>();
  for (const row of (data ?? []) as {
    product_id: string;
    content_hash: string;
  }[]) {
    hashes.set(row.product_id, row.content_hash);
  }
  return hashes;
}

export async function setProductEmbedding(
  productId: string,
  embedding: number[],
  hash: string,
): Promise<void> {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("admin_set_product_embedding", {
    p_product_id: productId,
    p_embedding: embedding,
    p_content_hash: hash,
  });
  if (error) throw new Error(`setProductEmbedding failed: ${error.message}`);
}
