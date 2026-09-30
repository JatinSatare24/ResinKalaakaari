import { createServerSupabaseClient } from "@/lib/server";
import type { Category } from "@/lib/types";

// `limit` is optional: the products filter wants every category, the home
// page "Shop by Category" strip only wants the first few.
export async function getCategories(limit?: number): Promise<Category[]> {
  const supabase = await createServerSupabaseClient();

  let query = supabase
    .from("categories")
    .select("id, name, slug, displayOrder")
    .order("displayOrder");

  if (limit) query = query.limit(limit);

  const { data, error } = await query;

  // Supabase hands errors back instead of throwing them, so we throw here.
  // That lets error.tsx catch it and show the error screen.
  if (error) throw new Error(`getCategories failed: ${error.message}`);

  return (data ?? []) as Category[];
}
