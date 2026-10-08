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
import type { ProductDetails } from "@/lib/product-admin";
import { buildPhotoList } from "@/lib/product-image";
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
        "id, name, slug, description, price, image_url, category_id, is_featured, is_gallery, product_images(image_url, sort_order)",
      )
      .eq("id", id)
      .order("sort_order", { referencedTable: "product_images" })
      .maybeSingle(); // no match -> data is null, not an error

    if (error) throw new Error(`getAdminProduct failed: ${error.message}`);
    if (!data) return null;

    const { product_images, ...row } = data as unknown as Omit<
      AdminProductDetail,
      "is_featured" | "photos"
    > & {
      is_featured: boolean | null;
      product_images: { image_url: string; sort_order: number }[] | null;
    };
    return {
      ...row,
      is_featured: row.is_featured === true,
      photos: buildPhotoList(row.image_url, product_images ?? []),
    };
  },
);

// --- Writes (each one is a Postgres function) ---

// The failures the SQL functions raise, as exception messages. The functions
// below hand a known one back as a result; anything else is a real failure
// and gets thrown. (Phase 10 had single-photo createProduct / updateProduct
// here; Phase 10b replaced both with the *WithPhotos pair below, because a
// product's text and its photos must be saved in one transaction.)
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
const UPDATE_FAILURES = [...SAVE_FAILURES, "product_not_found"] as const;

// --- Save with photos (Phase 10b, phase-10b-gallery-A2-atomic.sql) ---
// ONE database call per Save. The wrappers save the text and the whole photo
// list in a single transaction: all of it is stored, or none of it. (The
// photo list is ONE ordered array: photos[0] becomes the main photo, which is
// products.image_url, and the rest become the extras in that order. "Make
// main" and "move up / down" are therefore the same call with the list in a
// new order.) The callers validate first (validateProduct / validatePhotos);
// the database checks every rule again.

// The two new codes the photo list can add to the ones above.
const PHOTO_LIST_FAILURES = ["too_many_photos", "duplicate_photo"] as const;

const CREATE_WITH_PHOTOS_FAILURES = [
  ...CREATE_FAILURES,
  ...PHOTO_LIST_FAILURES,
] as const;
export type CreateWithPhotosFailure =
  (typeof CREATE_WITH_PHOTOS_FAILURES)[number];

const UPDATE_WITH_PHOTOS_FAILURES = [
  ...UPDATE_FAILURES,
  ...PHOTO_LIST_FAILURES,
] as const;
export type UpdateWithPhotosFailure =
  (typeof UPDATE_WITH_PHOTOS_FAILURES)[number];

export type CreateWithPhotosResult =
  { ok: true; id: string } | { ok: false; reason: CreateWithPhotosFailure };

export async function createProductWithPhotos(
  details: ProductDetails,
  photos: string[],
): Promise<CreateWithPhotosResult> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase.rpc(
    "admin_create_product_with_photos",
    {
      p_name: details.name,
      p_description: details.description,
      p_price: details.price,
      p_photos: photos,
      p_category_id: details.category_id,
      p_is_featured: details.is_featured,
      p_is_gallery: details.is_gallery,
    },
  );

  if (error) {
    const reason = knownFailure(CREATE_WITH_PHOTOS_FAILURES, error.message);
    if (reason) return { ok: false, reason };
    throw new Error(`createProductWithPhotos failed: ${error.message}`);
  }
  if (typeof data !== "string") {
    throw new Error("createProductWithPhotos failed: no product id returned");
  }
  return { ok: true, id: data };
}

export type UpdateWithPhotosResult =
  | {
      ok: true;
      // Links of files that no product uses any more AND that the admin form
      // uploaded (products/ folder). The caller may delete them from the
      // bucket after the save. Empty when there is nothing to delete.
      unusedUrls: string[];
    }
  | { ok: false; reason: UpdateWithPhotosFailure };

export async function updateProductWithPhotos(
  id: string,
  details: ProductDetails,
  photos: string[],
): Promise<UpdateWithPhotosResult> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase.rpc(
    "admin_update_product_with_photos",
    {
      p_id: id,
      p_name: details.name,
      p_description: details.description,
      p_price: details.price,
      p_photos: photos,
      p_category_id: details.category_id,
      p_is_featured: details.is_featured,
      p_is_gallery: details.is_gallery,
    },
  );

  if (error) {
    const reason = knownFailure(UPDATE_WITH_PHOTOS_FAILURES, error.message);
    if (reason) return { ok: false, reason };
    throw new Error(`updateProductWithPhotos failed: ${error.message}`);
  }
  // Anything else than a list of strings means a broken function, not a result.
  if (!Array.isArray(data) || !data.every((url) => typeof url === "string")) {
    throw new Error("updateProductWithPhotos failed: unexpected result");
  }
  return { ok: true, unusedUrls: data };
}
