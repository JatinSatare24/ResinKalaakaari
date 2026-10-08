// Admin category data layer. Server client only. Same split as
// admin-products.ts: reads use the public SELECT policy, writes go through
// Postgres functions that check is_admin() themselves. There is no delete:
// products point at categories (ON DELETE RESTRICT), so a category that is
// in use could not go anyway.
import { createServerSupabaseClient } from "@/lib/server";
import { knownFailure } from "@/lib/data/orders";
import type { AdminCategory } from "@/lib/types";

type AdminCategoryRow = Omit<AdminCategory, "product_count"> & {
  products: { count: number }[]; // products(count) comes back as a one-item list
};

// Every category in display order, with how many products each one holds.
export async function getAdminCategories(): Promise<AdminCategory[]> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("categories")
    .select("id, name, slug, displayOrder, products(count)")
    .order("displayOrder");

  if (error) throw new Error(`getAdminCategories failed: ${error.message}`);

  const rows = (data ?? []) as unknown as AdminCategoryRow[];
  return rows.map(({ products, ...category }) => ({
    ...category,
    product_count: products[0]?.count ?? 0,
  }));
}

// --- Writes (each one is a Postgres function) ---

const CREATE_FAILURES = [
  "not_authenticated",
  "not_admin",
  "invalid_name",
  "category_name_taken",
  "slug_unavailable",
] as const;
export type CreateCategoryFailure = (typeof CREATE_FAILURES)[number];

const RENAME_FAILURES = [
  "not_authenticated",
  "not_admin",
  "invalid_name",
  "category_name_taken",
  "category_not_found",
] as const;
export type RenameCategoryFailure = (typeof RENAME_FAILURES)[number];

export type CreateCategoryResult =
  { ok: true; id: string } | { ok: false; reason: CreateCategoryFailure };

// The slug and the display order are made by the database. Names are unique
// whatever the capital letters ("Clocks" and "clocks" are the same name).
export async function createCategory(
  name: string,
): Promise<CreateCategoryResult> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase.rpc("admin_create_category", {
    p_name: name,
  });

  if (error) {
    const reason = knownFailure(CREATE_FAILURES, error.message);
    if (reason) return { ok: false, reason };
    throw new Error(`createCategory failed: ${error.message}`);
  }
  if (typeof data !== "string") {
    throw new Error("createCategory failed: no category id returned");
  }
  return { ok: true, id: data };
}

export type RenameCategoryResult =
  { ok: true } | { ok: false; reason: RenameCategoryFailure };

// Only the name changes. The slug stays, because /products?category=<slug>
// links and bookmarks use it.
export async function renameCategory(
  id: string,
  name: string,
): Promise<RenameCategoryResult> {
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase.rpc("admin_rename_category", {
    p_id: id,
    p_name: name,
  });

  if (error) {
    const reason = knownFailure(RENAME_FAILURES, error.message);
    if (reason) return { ok: false, reason };
    throw new Error(`renameCategory failed: ${error.message}`);
  }
  return { ok: true };
}
