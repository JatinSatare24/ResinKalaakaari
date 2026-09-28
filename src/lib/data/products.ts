import { cache } from "react";
import { createServerSupabaseClient } from "@/lib/server";
import { PRODUCTS_PER_PAGE } from "@/lib/constants";
import { PRODUCT_SORTS, type ProductSort } from "@/lib/product-sorts";
import type { ProductSummary, ProductWithCategory } from "@/lib/types";

const SUMMARY_COLUMNS = "id, name, slug, image_url, price";

type GetProductsParams = {
  category?: string; // category slug, e.g. "resin-clocks"
  search?: string;
  sort?: ProductSort;
  page?: number; // 1-based
};

export type ProductsResult = {
  products: ProductSummary[]; // just this page
  totalCount: number; // all matches, across every page
};

// Search text goes into a PostgREST filter *string* (see .or() below), where
// commas and parentheses have special meaning, and % _ act as wildcards.
// So we swap those characters for spaces before using the text.
function cleanSearch(search: string): string {
  return search
    .replace(/[%_*,()"\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function getProducts({
  category,
  search,
  sort = "newest",
  page = 1,
}: GetProductsParams = {}): Promise<ProductsResult> {
  const supabase = await createServerSupabaseClient();

  // Page 1 -> rows 0..11, page 2 -> rows 12..23. Supabase counts both ends.
  const from = (page - 1) * PRODUCTS_PER_PAGE;
  const to = from + PRODUCTS_PER_PAGE - 1;

  // Join the categories table only when we filter by it. "!inner" drops
  // products with no matching category, so we only want it when a category
  // was actually chosen. { count: "exact" } also returns the total number of
  // matches (ignoring .range), so no separate count query is needed.
  let query = supabase
    .from("products")
    .select(
      category ? `${SUMMARY_COLUMNS}, categories!inner(slug)` : SUMMARY_COLUMNS,
      { count: "exact" },
    );

  // Filters are added only when the param was actually passed.
  if (category) query = query.eq("categories.slug", category);

  const term = search ? cleanSearch(search) : "";
  if (term) {
    query = query.or(`name.ilike.%${term}%,description.ilike.%${term}%`);
  }

  // Sort, then "id" as a tie-breaker so two products with the same price or
  // timestamp always land in the same order (otherwise a product could show
  // up on two pages, or on none).
  const { column, ascending } = PRODUCT_SORTS[sort];
  query = query.order(column, { ascending }).order("id").range(from, to);

  const { data, error, count } = await query;

  if (error) {
    // PGRST103 = "range not satisfiable": the page number is past the end.
    // The page component turns this into a redirect.
    if (error.code === "PGRST103") return { products: [], totalCount: 0 };
    throw new Error(`getProducts failed: ${error.message}`);
  }

  return {
    products: (data ?? []) as unknown as ProductSummary[],
    totalCount: count ?? 0,
  };
}

// cache() = if this is called twice with the same slug during ONE request
// (generateMetadata + the page both need it), the query runs only once.
export const getProductBySlug = cache(
  async (slug: string): Promise<ProductWithCategory | null> => {
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
      .from("products")
      .select(
        "id, name, slug, description, price, image_url, category_id, categories(name, slug)",
      )
      .eq("slug", slug)
      .maybeSingle(); // no match -> data is null, not an error

    if (error) throw new Error(`getProductBySlug failed: ${error.message}`);

    return data as unknown as ProductWithCategory | null;
  },
);

export async function getRelatedProducts(
  categoryId: string,
  excludeProductId: string,
  limit = 4,
): Promise<ProductSummary[]> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("products")
    .select(SUMMARY_COLUMNS)
    .eq("category_id", categoryId)
    .neq("id", excludeProductId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`getRelatedProducts failed: ${error.message}`);

  return (data ?? []) as ProductSummary[];
}
