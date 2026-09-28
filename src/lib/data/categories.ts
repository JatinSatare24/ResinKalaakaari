import { createServerSupabaseClient } from "@/lib/server";
import type { Category } from "@/lib/types";

export async function getCategories(): Promise<Category[]> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("categories")
    .select("id, name, slug, displayOrder")
    .order("displayOrder");

  // Supabase hands errors back instead of throwing them, so we throw here.
  // That lets error.tsx catch it and show the error screen.
  if (error) throw new Error(`getCategories failed: ${error.message}`);

  return (data ?? []) as Category[];
}
