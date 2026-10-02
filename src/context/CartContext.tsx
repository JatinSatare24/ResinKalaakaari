"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { client } from "@/lib/supabase";
import { EMPTY_ITEMS, EMPTY_STORED_CART, sortLike } from "@/lib/cart";
import {
  getServerStoredCart,
  getStoredCart,
  setStoredCart,
  subscribeStoredCart,
} from "@/lib/cart-storage";
import { MAX_CART_QUANTITY } from "@/lib/constants";
import {
  deleteAllCartItems,
  deleteCartItem,
  getCartItems,
  loadCartForUser,
  upsertCartItems,
} from "@/lib/data/cart";
import type { CartItem, CartProduct } from "@/lib/types";

/*
 * HOW THE CART WORKS (read this first)
 *
 * Guest (signed out): the cart lives only in localStorage.
 * Signed in: the database (cart_items) is the truth. localStorage keeps a
 *   copy, tagged with the user's id, so the page shows the cart instantly
 *   on reload while the database copy loads.
 *
 * On sign-in we run loadCartForUser ONCE per user: merge the guest cart into
 * the saved cart, then the database wins. On sign-out the local copy is wiped.
 *
 * Every change updates the screen first, then writes ONE row to the database
 * through a queue (one write at a time, in click order). If a write fails we
 * reload the cart from the database so the screen never keeps a lie.
 */

type CartContextType = {
  cart: CartItem[];
  user: User | null;
  // True until Supabase has told us who is signed in. No component reads it
  // any more (protected pages check the user on the server); it is kept for
  // now and can go in a later cleanup.
  loading: boolean;
  // True once the cart can be trusted: auth is known and, for a signed-in
  // user, the database copy has loaded. Changes are ignored before that.
  cartReady: boolean;
  cartLoadFailed: boolean;
  syncError: string | null;
  addToCart: (product: CartProduct) => Promise<void>;
  removeFromCart: (id: string) => Promise<void>;
  // `delta` is how much to change by (+1 / -1), not the new quantity.
  updateQuantity: (id: string, delta: number) => Promise<void>;
  clearCart: () => Promise<void>;
  // Resolves when every queued database write has finished. Checkout waits
  // for this, because the order is built from the SAVED cart.
  flushCart: () => Promise<void>;
  retryCartLoad: () => void;
};

export const CartContext = createContext<CartContextType | null>(null);

// Same as useContext(CartContext) but throws a clear error outside the
// provider, so callers don't need a `!`.
export function useCart(): CartContextType {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside <CartProvider>");
  return context;
}

const SYNC_ERROR_MESSAGE =
  "We couldn't save your last cart change, so we restored your saved cart.";

export default function CartProvider({ children }: { children: ReactNode }) {
  // The cart items. The server render and the first hydration render get an
  // empty cart; the real one appears right after (no hydration mismatch).
  const stored = useSyncExternalStore(
    subscribeStoredCart,
    getStoredCart,
    getServerStoredCart,
  );

  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  // Result of the last database load: which user, and did it work.
  const [loadResult, setLoadResult] = useState<{
    userId: string;
    ok: boolean;
  } | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [syncError, setSyncError] = useState<string | null>(null);
  // The tail of the database write queue (see enqueue below).
  const writeQueue = useRef<Promise<void>>(Promise.resolve());

  // Effects depend on the id (a string), not the user object: Supabase hands
  // out a new object on token refresh, and can emit SIGNED_IN again when a
  // tab regains focus, none of which should reload the cart.
  const userId = user?.id ?? null;

  // 1. Who is signed in? INITIAL_SESSION fires once when the client starts, so
  // no separate getUser() call (one less network request than before).
  // Only set state here; never call other Supabase methods inside this callback.
  useEffect(() => {
    const {
      data: { subscription },
    } = client().auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      // Signed out: forget the last load, so signing back in loads again.
      if (!nextUser) setLoadResult(null);
      setAuthReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  // 2. A saved cart that belongs to someone else (signed out, or another
  // account signed in) must not show up. Wipe the local copy.
  // Declared before the load effect, so it runs first.
  useEffect(() => {
    if (!authReady) return;
    const { ownerId } = getStoredCart();
    if (ownerId !== null && ownerId !== userId) {
      setStoredCart(EMPTY_STORED_CART);
    }
  }, [authReady, userId]);

  // 3. Signed in: merge the guest cart, load the saved cart, save the result.
  // `cancelled` drops the answer if the user changed while we were waiting.
  // Running twice (Strict Mode, two tabs) is safe: the merge gives the same
  // result every time (see mergeCarts).
  useEffect(() => {
    if (!authReady || !userId) return;
    let cancelled = false;
    const local = getStoredCart();

    (async () => {
      try {
        const items = await loadCartForUser(client(), userId, local);
        if (cancelled) return;
        setStoredCart({ ownerId: userId, items });
        setLoadResult({ userId, ok: true });
      } catch (error) {
        console.error("Cart load failed:", error);
        if (!cancelled) setLoadResult({ userId, ok: false });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authReady, userId, retryCount]);

  const cartReady =
    authReady &&
    (userId === null || (loadResult?.userId === userId && loadResult.ok));
  const cartLoadFailed =
    userId !== null && loadResult?.userId === userId && !loadResult.ok;

  // Hide a cart that is known to belong to somebody else (rule 2 wipes it a
  // moment later). Before auth is known we show whatever is saved.
  const items =
    authReady && stored.ownerId !== null && stored.ownerId !== userId
      ? EMPTY_ITEMS
      : stored.items;

  // --- Database writes ---

  // Reload the cart from the database and show that.
  const resync = useCallback(async (uid: string) => {
    try {
      const dbItems = await getCartItems(client(), uid);
      const current = getStoredCart();
      if (current.ownerId === uid) {
        setStoredCart({
          ownerId: uid,
          items: sortLike(dbItems, current.items),
        });
      }
    } catch (error) {
      console.error("Cart resync failed:", error);
    }
  }, []);

  // Runs database writes ONE AT A TIME, in the order they were queued.
  // Without this, two quick clicks send two requests that can finish in the
  // wrong order, and the database ends up with the older quantity.
  const enqueue = useCallback(
    (uid: string, write: (supabase: SupabaseClient) => Promise<void>) => {
      const run = writeQueue.current.then(() => write(client()));
      // The stored tail never rejects, so one failure can't block later writes.
      writeQueue.current = run.catch(async (error) => {
        console.error("Cart write failed:", error);
        setSyncError(SYNC_ERROR_MESSAGE);
        await resync(uid);
      });
      return writeQueue.current;
    },
    [resync],
  );

  // Make the database row for ONE product match what the screen shows NOW.
  // It reads the current quantity when it runs (not when it was queued), so
  // a stale queued write can never put an old number back.
  const syncProduct = useCallback(
    (uid: string, productId: string) =>
      enqueue(uid, async (supabase) => {
        const { ownerId, items: current } = getStoredCart();
        if (ownerId !== uid) return; // the account changed while we waited
        const line = current.find((item) => item.id === productId);
        if (line) await upsertCartItems(supabase, uid, [line]);
        else await deleteCartItem(supabase, uid, productId);
      }),
    [enqueue],
  );

  // --- Cart actions ---
  // Each one reads the LATEST cart from the store (not from the last render),
  // so two clicks in the same instant both count.

  const addToCart = useCallback(
    async (product: CartProduct) => {
      if (!cartReady) return;
      setSyncError(null);

      const { items: current } = getStoredCart();
      const exists = current.some((item) => item.id === product.id);
      const next = exists
        ? current.map((item) =>
            item.id === product.id
              ? {
                  ...item,
                  quantity: Math.min(item.quantity + 1, MAX_CART_QUANTITY),
                }
              : item,
          )
        : [
            ...current,
            {
              id: product.id,
              name: product.name,
              price: product.price,
              image_url: product.image_url,
              quantity: 1,
            },
          ];

      setStoredCart({ ownerId: userId, items: next });
      if (userId) await syncProduct(userId, product.id);
    },
    [cartReady, userId, syncProduct],
  );

  const removeFromCart = useCallback(
    async (id: string) => {
      if (!cartReady) return;
      setSyncError(null);

      const { items: current } = getStoredCart();
      setStoredCart({
        ownerId: userId,
        items: current.filter((item) => item.id !== id),
      });
      if (userId) await syncProduct(userId, id);
    },
    [cartReady, userId, syncProduct],
  );

  const updateQuantity = useCallback(
    async (id: string, delta: number) => {
      if (!cartReady) return;

      const { items: current } = getStoredCart();
      const line = current.find((item) => item.id === id);
      if (!line) return;

      const quantity = Math.min(line.quantity + delta, MAX_CART_QUANTITY);
      if (quantity < 1) {
        // Going below 1 means "remove this line".
        await removeFromCart(id);
        return;
      }

      setSyncError(null);
      setStoredCart({
        ownerId: userId,
        items: current.map((item) =>
          item.id === id ? { ...item, quantity } : item,
        ),
      });
      if (userId) await syncProduct(userId, id);
    },
    [cartReady, userId, removeFromCart, syncProduct],
  );

  const clearCart = useCallback(async () => {
    if (!cartReady) return;
    setSyncError(null);

    setStoredCart({ ownerId: userId, items: EMPTY_ITEMS });
    if (userId) {
      await enqueue(userId, (supabase) => deleteAllCartItems(supabase, userId));
    }
  }, [cartReady, userId, enqueue]);

  // The queue tail never rejects (see enqueue), so this never throws.
  const flushCart = useCallback(() => writeQueue.current, []);

  const retryCartLoad = useCallback(() => {
    setLoadResult(null);
    setRetryCount((count) => count + 1);
  }, []);

  // useMemo keeps the value object the same between renders, so components
  // that read the cart only re-render when something in it really changed
  // (the layout re-renders this provider on navigation).
  const value = useMemo<CartContextType>(
    () => ({
      cart: items,
      user,
      loading: !authReady,
      cartReady,
      cartLoadFailed,
      syncError,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      flushCart,
      retryCartLoad,
    }),
    [
      items,
      user,
      authReady,
      cartReady,
      cartLoadFailed,
      syncError,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      flushCart,
      retryCartLoad,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
