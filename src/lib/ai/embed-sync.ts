// Keeps the product search index (one embedding per product) in step with the
// products table. Two jobs:
//   syncProductEmbedding  after the owner saves ONE product (best effort)
//   rebuildSearchIndex    the admin "Rebuild search index" button (catch-up)
//
// The index is a convenience, not the source of truth. A failure here must
// never undo or block a product save, so neither function throws: they report
// what happened. Everything outside (database, provider) comes in as `deps`.
import { buildEmbeddingText, contentHash } from "@/lib/ai/embeddings";
import type { CallOptions } from "@/lib/ai/types";
import type { EmbedProduct } from "@/lib/data/admin-embeddings";

export type EmbedSyncDeps = {
  getProduct(id: string): Promise<EmbedProduct | null>;
  listProducts(): Promise<EmbedProduct[]>;
  listHashes(): Promise<Map<string, string>>;
  setEmbedding(id: string, embedding: number[], hash: string): Promise<void>;
  embed(texts: string[], options?: CallOptions): Promise<number[][]>;
  // Safe to log: ids and counts only, never product text.
  log(event: string, detail?: Record<string, unknown>): void;
};

// The admin is waiting for the save to finish, so this is short.
export const SAVE_EMBED_TIMEOUT_MS = 4_000;

function textOf(product: EmbedProduct): string {
  return buildEmbeddingText({
    name: product.name,
    categoryName: product.categoryName,
    description: product.description,
  });
}

export async function syncProductEmbedding(
  productId: string,
  deps: EmbedSyncDeps,
  timeoutMs: number = SAVE_EMBED_TIMEOUT_MS,
): Promise<"updated" | "failed"> {
  try {
    const product = await deps.getProduct(productId);
    if (!product) return "failed";
    const text = textOf(product);
    const [vector] = await deps.embed([text], { timeoutMs });
    await deps.setEmbedding(productId, vector, contentHash(text));
    return "updated";
  } catch {
    deps.log("embed_on_save_failed", { productId });
    return "failed";
  }
}

export type RebuildResult = {
  total: number; // products in the shop
  updated: number; // embedded just now
  unchanged: number; // already up to date, skipped (this is what saves money)
  failed: number;
};

export async function rebuildSearchIndex(
  deps: EmbedSyncDeps,
): Promise<RebuildResult> {
  const products = await deps.listProducts();
  const hashes = await deps.listHashes();

  const stale: { id: string; text: string; hash: string }[] = [];
  for (const product of products) {
    const text = textOf(product);
    const hash = contentHash(text);
    if (hashes.get(product.id) !== hash) {
      stale.push({ id: product.id, text, hash });
    }
  }

  const result: RebuildResult = {
    total: products.length,
    updated: 0,
    unchanged: products.length - stale.length,
    failed: 0,
  };
  if (stale.length === 0) return result;

  let vectors: number[][];
  try {
    // The provider sends these in batches of 20.
    vectors = await deps.embed(stale.map((item) => item.text));
  } catch {
    deps.log("rebuild_embed_failed", { count: stale.length });
    return { ...result, failed: stale.length };
  }

  for (let i = 0; i < stale.length; i++) {
    try {
      await deps.setEmbedding(stale[i].id, vectors[i], stale[i].hash);
      result.updated += 1;
    } catch {
      deps.log("rebuild_store_failed", { productId: stale[i].id });
      result.failed += 1;
    }
  }
  return result;
}
