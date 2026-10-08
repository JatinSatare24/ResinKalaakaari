// Admin product data layer. Server client only. Reads use the public SELECT
// policy on products (the admin sees the same rows as shoppers); every write
// goes through a Postgres function (phase-10-product-admin-A.sql) that checks
// is_admin() itself. The admin has NO insert/update/delete policy on the
// table, so even a bug in this app cannot write a bad price or slug.
// Pages and actions check the role first (requireAdmin / getIsAdmin), the
// database checks it again: two locks, same as admin-orders.ts.
import { cache } from "react";
import { createServerSupabaseClient } from "@/lib/server";
import { ADMIN_PRODUCTS_PER_PAGE } from "@/lib/constants";
import { knownFailure } from "@/lib/data/orders";
import { cleanSearch } from "@/lib/data/products";
import { isUuid } from "@/lib/orders";
import type { ProductInput } from "@/lib/product-admin";
import type { AdminProductsQuery } from "@/lib/search-params";
import type { AdminProduct, AdminProductDetail } from "@/lib/types";

// products.is_featured can be NULL in the database (no NOT NULL on the column).
type AdminProductRow = Omit<AdminProduct, "is_featured"> & {
  is_featured: boolean | null;
};

export type AdminProductsResult = {
  products: AdminProduct[]; // just this page, A to Z
  totalCount: number; // all products, across every page
};

export async function getAdminProducts({
  search,
  page,
}: AdminProductsQuery): Promise<AdminProductsResult> {
  const supabase = await createServerSupabaseClient();

  // Page 1 -> rows 0..19. Supabase counts both ends.
  const from = (page - 1) * ADMIN_PRODUCTS_PER_PAGE;
  const to = from + ADMIN_PRODUCTS_PER_PAGE - 1;

  let query = supabase
    .from("products")
    // Only what the list shows. categories(name) is the joined category.
    .select(
      "id, name, slug, price, image_url, is_featured, is_gallery, categories(name)",
      { count: "exact" },
    );

  // Search by NAME only (the owner knows what she called a product). The
  // same cleaner as the shop search: it strips the characters that have a
  // special meaning in a PostgREST filter.
  const term = search ? cleanSearch(search) : "";
  if (term) query = query.ilike("name", `%${term}%`);

  const { data, error, count } = await query
    .order("name")
    .order("id") // tie-breaker, same reason as in getProducts
    .range(from, to);

  if (error) {
    // PGRST103 = page past the end. The page turns this into a redirect.
    if (error.code === "PGRST103") return { products: [], totalCount: 0 };
    throw new Error(`getAdminProducts failed: ${error.message}`);
  }

  const rows = (data ?? []) as unknown as AdminProductRow[];
  return {
    products: rows.map((row) => ({
      ...row,
      is_featured: row.is_featured === true,
    })),
    totalCount: count ?? 0,
  };
}

// One product for the edit form, or null when the id is not a real product
// (the page shows the normal 404). cache() = the page and generateMetadata
// can both call it and the query still runs once per request.
export const getAdminProduct = cache(
  async (id: string): Promise<AdminProductDetail | null> => {
    // A malformed id would make Postgres throw "invalid uuid".
    if (!isUuid(id)) return null;
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
      .from("products")
      .select(
        "id, name, slug, description, price, image_url, category_id, is_featured, is_gallery",
      )
      .eq("id", id)
      .maybeSingle(); // no match -> data is null, not an error

    if (error) throw new Error(`getAdminProduct failed: ${error.message}`);
    if (!data) return null;

    const row = data as unknown as Omit<AdminProductDetail, "is_featured"> & {
      is_featured: boolean | null;
    };
    return { ...row, is_featured: row.is_featured === true };
  },
);

// --- Writes (each one is a Postgres function) ---

// The checks both functions share. The SQL raises these as exception
// messages; anything else is a real failure and gets thrown.
const SAVE_FAILURES = [
  "not_authenticated",
  "not_admin",
  "invalid_name",
  "invalid_description",
  "invalid_price",
  "invalid_image",
  "category_not_found",
] as const;

const CREATE_FAILURES = [...SAVE_FAILURES, "slug_unavailable"] as const;
export type CreateProductFailure = (typeof CREATE_FAILURES)[number];

const UPDATE_FAILURES = [...SAVE_FAILURES, "product_not_found"] as const;
export type UpdateProductFailure = (typeof UPDATE_FAILURES)[number];

export type CreateProductResult =
  { ok: true; id: string } | { ok: false; reason: CreateProductFailure };

// The slug is made by the database from the name (and never changes later).
export async function createProduct(
  input: ProductInput,
): Promise<CreateProductResult> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase.rpc("admin_create_product", {
    p_name: input.name,
    p_description: input.description,
    p_price: input.price,
    p_image_url: input.image_url,
    p_category_id: input.category_id,
    p_is_featured: input.is_featured,
    p_is_gallery: input.is_gallery,
  });

  if (error) {
    const reason = knownFailure(CREATE_FAILURES, error.message);
    if (reason) return { ok: false, reason };
    throw new Error(`createProduct failed: ${error.message}`);
  }
  if (typeof data !== "string") {
    throw new Error("createProduct failed: no product id returned");
  }
  return { ok: true, id: data };
}

export type UpdateProductResult =
  | {
      ok: true;
      // The photo that was just replaced, when it is now unused AND was
      // uploaded by the admin form. The caller may delete that file. Null
      // when nothing should be deleted.
      replacedImageUrl: string | null;
    }
  | { ok: false; reason: UpdateProductFailure };

export async function updateProduct(
  id: string,
  input: ProductInput,
): Promise<UpdateProductResult> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase.rpc("admin_update_product", {
    p_id: id,
    p_name: input.name,
    p_description: input.description,
    p_price: input.price,
    p_image_url: input.image_url,
    p_category_id: input.category_id,
    p_is_featured: input.is_featured,
    p_is_gallery: input.is_gallery,
  });

  if (error) {
    const reason = knownFailure(UPDATE_FAILURES, error.message);
    if (reason) return { ok: false, reason };
    throw new Error(`updateProduct failed: ${error.message}`);
  }
  return {
    ok: true,
    replacedImageUrl: typeof data === "string" ? data : null,
  };
}
