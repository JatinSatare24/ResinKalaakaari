// The only sort options the products page accepts.
// key   = what appears in the URL (?sort=price_asc)
// value = the label shown in the dropdown + what we hand to Supabase
// Anything that is not a key here is ignored, so nobody can sort by a
// random column through the URL.
export const PRODUCT_SORTS = {
  price_asc: { label: "Price: Low to High", column: "price", ascending: true },
  price_desc: {
    label: "Price: High to Low",
    column: "price",
    ascending: false,
  },
  newest: { label: "Newest", column: "created_at", ascending: false },
} as const;

export type ProductSort = keyof typeof PRODUCT_SORTS;

// A "type guard": if this returns true, TypeScript treats the value as one
// of our sort names. Object.hasOwn checks only our own keys. (The `in`
// operator would also say yes to inherited names like "constructor".)
export function isProductSort(value: string | undefined): value is ProductSort {
  return value !== undefined && Object.hasOwn(PRODUCT_SORTS, value);
}
