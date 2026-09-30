// Pure cart logic: no React, no browser APIs, no Supabase. Everything here is
// plain input -> output, which makes it easy to test and to explain.
import { MAX_CART_QUANTITY } from "@/lib/constants";
import type { CartItem, CartProduct } from "@/lib/types";

// What we keep in localStorage: the items AND whose they are.
// ownerId null   = a guest's cart.
// ownerId "<id>" = a local copy of that signed-in user's database cart.
export type StoredCart = { ownerId: string | null; items: CartItem[] };

// One shared empty array/object so "empty" is always the same reference
// (React skips re-renders when a value is the same reference).
export const EMPTY_ITEMS: CartItem[] = [];
export const EMPTY_STORED_CART: StoredCart = {
  ownerId: null,
  items: EMPTY_ITEMS,
};

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// Checks that unknown data really is a product and copies out ONLY the four
// fields we know. Anything else on the object is dropped.
export function toCartProduct(value: unknown): CartProduct | null {
  if (!isRecord(value)) return null;
  const { id, name, price, image_url } = value;
  if (
    typeof id !== "string" ||
    id === "" ||
    typeof name !== "string" ||
    typeof image_url !== "string" ||
    typeof price !== "number" ||
    !Number.isFinite(price) ||
    price < 0
  ) {
    return null;
  }
  return { id, name, price, image_url };
}

// Same, plus a whole-number quantity of at least 1 (capped at the maximum).
export function toCartItem(value: unknown): CartItem | null {
  const product = toCartProduct(value);
  if (!product || !isRecord(value)) return null;
  const { quantity } = value;
  if (
    typeof quantity !== "number" ||
    !Number.isInteger(quantity) ||
    quantity < 1
  ) {
    return null;
  }
  return { ...product, quantity: Math.min(quantity, MAX_CART_QUANTITY) };
}

// localStorage holds text anyone can edit, so JSON.parse alone proves nothing.
// Bad JSON, the wrong shape, bad lines and duplicate lines are all dropped.
export function parseStoredCart(raw: string | null): StoredCart {
  if (!raw) return EMPTY_STORED_CART;
  try {
    const data: unknown = JSON.parse(raw);
    if (!isRecord(data) || !Array.isArray(data.items)) {
      return EMPTY_STORED_CART;
    }
    const { ownerId } = data;
    if (ownerId !== null && typeof ownerId !== "string") {
      return EMPTY_STORED_CART;
    }

    const seen = new Set<string>();
    const items: CartItem[] = [];
    for (const entry of data.items) {
      const item = toCartItem(entry);
      if (item && !seen.has(item.id)) {
        seen.add(item.id);
        items.push(item);
      }
    }
    if (items.length === 0 && ownerId === null) return EMPTY_STORED_CART;
    return { ownerId, items };
  } catch {
    return EMPTY_STORED_CART;
  }
}

// Guest cart + saved cart -> one cart. Rules:
//  - a product in only one cart is kept
//  - a product in both keeps the LARGER quantity (not the sum)
//  - name/price/image come from the database copy when there is one
// "Larger wins" is on purpose: running this twice gives the same answer as
// running it once (a sum would double-count if the code ever ran twice, e.g.
// React Strict Mode in dev or two tabs signing in together).
// `toWrite` = only the lines the database does not already have right.
export function mergeCarts(
  dbItems: CartItem[],
  guestItems: CartItem[],
): { items: CartItem[]; toWrite: CartItem[] } {
  const items = [...dbItems];
  const indexById = new Map(items.map((item, index) => [item.id, index]));
  const toWrite: CartItem[] = [];

  for (const guest of guestItems) {
    const index = indexById.get(guest.id);
    if (index === undefined) {
      indexById.set(guest.id, items.length);
      items.push(guest);
      toWrite.push(guest);
    } else if (guest.quantity > items[index].quantity) {
      const bumped = { ...items[index], quantity: guest.quantity };
      items[index] = bumped;
      toWrite.push(bumped);
    }
  }

  return { items, toWrite };
}

// Puts `items` in the same order as `reference` (unknown ones go last).
// The database returns rows in no promised order, so without this the cart
// could reshuffle on every page load.
export function sortLike(items: CartItem[], reference: CartItem[]): CartItem[] {
  const position = new Map(reference.map((item, index) => [item.id, index]));
  const last = Number.MAX_SAFE_INTEGER;
  return [...items].sort(
    (a, b) => (position.get(a.id) ?? last) - (position.get(b.id) ?? last),
  );
}

export function cartCount(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

export function cartTotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}
