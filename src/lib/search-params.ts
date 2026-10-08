import { isProductSort, type ProductSort } from "@/lib/product-sorts";

// The shape Next hands us for ?a=1&b=2. A value is a string, or an array
// of strings if the same key repeats (?search=a&search=b), or missing.
export type RawSearchParams = Record<string, string | string[] | undefined>;

// The cleaned version the rest of the app uses.
export type ProductsQuery = {
  category?: string;
  search?: string;
  sort?: ProductSort;
  page: number; // always a whole number >= 1
};

const MAX_SEARCH_LENGTH = 100;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

// Bad input never throws and never widens the query: it becomes page 1.
function parsePage(value: string | undefined): number {
  const n = Number(value); // "abc" -> NaN, "" -> 0, "2.5" -> 2.5
  return Number.isSafeInteger(n) && n >= 1 ? n : 1;
}

// For pages that only have ?page= (the admin list).
export function parsePageParam(raw: RawSearchParams): number {
  return parsePage(first(raw.page));
}

// Everything in a URL is untrusted text. This is the one place it gets
// cleaned before it reaches the data layer.
export function parseProductsQuery(raw: RawSearchParams): ProductsQuery {
  const sort = first(raw.sort);
  return {
    category: first(raw.category)?.trim() || undefined,
    search: first(raw.search)?.trim().slice(0, MAX_SEARCH_LENGTH) || undefined,
    sort: isProductSort(sort) ? sort : undefined,
    page: parsePage(first(raw.page)),
  };
}

// Builds a /products link from a query. Empty values and page 1 are left
// out, so links stay short: /products, /products?category=clocks&page=2
export function buildProductsHref(query: Partial<ProductsQuery>): string {
  const params = new URLSearchParams();
  if (query.category) params.set("category", query.category);
  if (query.search) params.set("search", query.search);
  if (query.sort) params.set("sort", query.sort);
  if (query.page && query.page > 1) params.set("page", String(query.page));
  const queryString = params.toString();
  return queryString ? `/products?${queryString}` : "/products";
}

// Link to one page of the admin orders list (page 1 has no query string).
export function buildAdminOrdersHref(page: number): string {
  return page > 1 ? `/admin/orders?page=${page}` : "/admin/orders";
}

// One place that builds "page + a few ?params" links, shared by every search
// box. `params` are the URL params to carry along (category, sort, search...);
// empty ones are left out. Page 1 has no ?page=, so links stay short.
export function buildSearchHref(
  basePath: string,
  params: Record<string, string | undefined>,
  page = 1,
): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) query.set(key, value);
  }
  if (page > 1) query.set("page", String(page));
  const queryString = query.toString();
  return queryString ? `${basePath}?${queryString}` : basePath;
}

// The admin products list has just ?search= and ?page=.
export type AdminProductsQuery = {
  search?: string;
  page: number; // always a whole number >= 1
};

export function parseAdminProductsQuery(
  raw: RawSearchParams,
): AdminProductsQuery {
  return {
    search: first(raw.search)?.trim().slice(0, MAX_SEARCH_LENGTH) || undefined,
    page: parsePage(first(raw.page)),
  };
}

// Link to one page of the admin products list.
export function buildAdminProductsHref(
  query: Partial<AdminProductsQuery>,
): string {
  return buildSearchHref(
    "/admin/products",
    { search: query.search },
    query.page,
  );
}
