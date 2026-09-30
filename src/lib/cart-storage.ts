// The browser-side cart store: one JS variable, saved to localStorage.
// React reads it with useSyncExternalStore (see CartContext.tsx), which is
// React's built-in way to read data that lives OUTSIDE React. That gives us:
//  - no "setState inside an effect" to load the saved cart
//  - no hydration mismatch (the server render uses the empty snapshot)
//  - other tabs stay in sync through the browser's "storage" event
import {
  EMPTY_STORED_CART,
  parseStoredCart,
  type StoredCart,
} from "@/lib/cart";

const STORAGE_KEY = "resin-kalaakari-cart";
// The old code saved a bare array under "cart". We never read it again
// (it could belong to any account), and delete it the first time we save.
const LEGACY_KEY = "cart";

let current: StoredCart = EMPTY_STORED_CART;
let loadedFromDisk = false;
const listeners = new Set<() => void>();

function readFromDisk() {
  try {
    current = parseStoredCart(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    // Storage blocked (some private modes): start empty, keep working in memory.
    current = EMPTY_STORED_CART;
  }
  loadedFromDisk = true;
}

// useSyncExternalStore needs the SAME object back until something changes,
// otherwise it re-renders forever. `current` only changes in set / storage event.
export function getStoredCart(): StoredCart {
  if (!loadedFromDisk) readFromDisk();
  return current;
}

// What the server (and the first hydration render) sees: always empty.
export function getServerStoredCart(): StoredCart {
  return EMPTY_STORED_CART;
}

export function setStoredCart(next: StoredCart): void {
  current = next;
  loadedFromDisk = true;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.localStorage.removeItem(LEGACY_KEY);
  } catch {
    // Storage full or blocked: the cart still works in memory for this tab.
  }
  listeners.forEach((listener) => listener());
}

export function subscribeStoredCart(onChange: () => void): () => void {
  listeners.add(onChange);

  // Fires in OTHER tabs when this key changes (key === null: storage cleared).
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY || event.key === null) {
      readFromDisk();
      onChange();
    }
  };
  window.addEventListener("storage", onStorage);

  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}
