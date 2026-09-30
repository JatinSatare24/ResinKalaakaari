// Cart data layer. Same idea as products.ts / categories.ts (every Supabase
// call for an entity lives here, typed, and throws on error), with ONE
// difference: those files use the server client, but the cart lives in the
// browser (a guest has no server session). So these functions take the
// Supabase client as an argument, and CartContext passes the browser client in.
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  isRecord,
  mergeCarts,
  sortLike,
  toCartItem,
  toCartProduct,
  type StoredCart,
} from "@/lib/cart";
import type { CartItem, CartProduct } from "@/lib/types";

// The signed-in user's saved cart, with each product's CURRENT details.
export async function getCartItems(
  supabase: SupabaseClient,
  userId: string,
): Promise<CartItem[]> {
  const { data, error } = await supabase
    .from("cart_items")
    .select("quantity, products(id, name, price, image_url)")
    // RLS already limits rows to the owner; the filter is a second lock.
    .eq("user_id", userId);

  if (error) throw new Error(`getCartItems failed: ${error.message}`);

  const rows: unknown[] = data ?? [];
  return rows.flatMap((row) => {
    if (!isRecord(row)) return [];
    // A row whose product was deleted comes back with products: null. Skip it.
    const product = toCartProduct(row.products);
    if (!product) return [];
    const item = toCartItem({ ...product, quantity: row.quantity });
    return item ? [item] : [];
  });
}

// Current name/price/image for some product ids. Products that no longer
// exist are simply missing from the result.
export async function getProductsByIds(
  supabase: SupabaseClient,
  productIds: string[],
): Promise<Map<string, CartProduct>> {
  const found = new Map<string, CartProduct>();
  if (productIds.length === 0) return found;

  const { data, error } = await supabase
    .from("products")
    .select("id, name, price, image_url")
    .in("id", productIds);

  if (error) throw new Error(`getProductsByIds failed: ${error.message}`);

  const rows: unknown[] = data ?? [];
  for (const row of rows) {
    const product = toCartProduct(row);
    if (product) found.set(product.id, product);
  }
  return found;
}

// Insert-or-update one row per product. onConflict relies on the UNIQUE
// (user_id, product_id) constraint on cart_items.
export async function upsertCartItems(
  supabase: SupabaseClient,
  userId: string,
  items: Pick<CartItem, "id" | "quantity">[],
): Promise<void> {
  if (items.length === 0) return;

  const rows = items.map((item) => ({
    user_id: userId,
    product_id: item.id,
    quantity: item.quantity,
  }));
  const { error } = await supabase
    .from("cart_items")
    .upsert(rows, { onConflict: "user_id,product_id" });

  if (error) throw new Error(`upsertCartItems failed: ${error.message}`);
}

export async function deleteCartItem(
  supabase: SupabaseClient,
  userId: string,
  productId: string,
): Promise<void> {
  const { error } = await supabase
    .from("cart_items")
    .delete()
    .eq("user_id", userId)
    .eq("product_id", productId);

  if (error) throw new Error(`deleteCartItem failed: ${error.message}`);
}

export async function deleteAllCartItems(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  const { error } = await supabase
    .from("cart_items")
    .delete()
    .eq("user_id", userId);

  if (error) throw new Error(`deleteAllCartItems failed: ${error.message}`);
}

// Runs when a user is signed in (page load, or right after login). Works out
// what the cart should be and makes the database agree. `local` is what the
// browser had saved.
//  1. Local copy is a GUEST cart -> merge it into the saved cart (larger
//     quantity wins), write what changed, return the merged cart.
//  2. Local copy is this user's own -> the database wins; keep local order.
//  3. Anything else (empty, or someone else's) -> just the saved cart.
export async function loadCartForUser(
  supabase: SupabaseClient,
  userId: string,
  local: StoredCart,
): Promise<CartItem[]> {
  const guestItems = local.ownerId === null ? local.items : [];

  if (guestItems.length === 0) {
    const dbItems = await getCartItems(supabase, userId);
    return local.ownerId === userId ? sortLike(dbItems, local.items) : dbItems;
  }

  // The guest cart may hold old prices, or products deleted since. Re-read
  // them, so we never upsert a product that no longer exists (that would
  // break on the foreign key and block the whole merge).
  const [dbItems, fresh] = await Promise.all([
    getCartItems(supabase, userId),
    getProductsByIds(
      supabase,
      guestItems.map((item) => item.id),
    ),
  ]);
  const currentGuestItems = guestItems.flatMap((item) => {
    const product = fresh.get(item.id);
    return product ? [{ ...product, quantity: item.quantity }] : [];
  });

  const { items, toWrite } = mergeCarts(dbItems, currentGuestItems);
  await upsertCartItems(supabase, userId, toWrite);
  return items;
}
