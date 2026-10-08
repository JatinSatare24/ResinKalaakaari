// What gets embedded for a product, and the fingerprint that says whether the
// stored embedding is out of date. Pure apart from the hash (node:crypto), so
// it is server-only like the rest of lib/ai.
import { createHash } from "node:crypto";
import { AI_LIMITS } from "@/lib/ai/config";
import { capText, cleanText } from "@/lib/ai/schemas";

// Name, category and description: the words a customer might search by. Price
// is left out on purpose: it changes often and says nothing about meaning, and
// prices always come from the table, never from an embedding.
export function buildEmbeddingText(product: {
  name: string;
  categoryName: string | null;
  description: string | null;
}): string {
  const parts = [product.name, product.categoryName, product.description]
    .map((part) => cleanText(part ?? ""))
    .filter(Boolean);
  return capText(parts.join("\n"), AI_LIMITS.maxEmbeddingTextChars);
}

// SHA-256 of the text, 64 lowercase hex characters (what the database checks).
// Saved next to the embedding: if the hash of today's text differs, the
// stored vector is stale.
export function contentHash(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}
