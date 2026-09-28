"use client";

/**
 * SEARCH BAR COMPONENT
 * Debounced product search. Writes ?search= into the URL; the server page
 * reads it and fetches the matching products.
 */

// --- IMPORTS ---
import { useState, useTransition } from "react";
import type { ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { useDebouncedCallback } from "use-debounce";
import { buildProductsHref, type ProductsQuery } from "@/lib/search-params";
import styles from "./SearchBar.module.css";

// --- INTERFACES ---
export interface SearchBarProps {
  query: ProductsQuery; // current URL state, passed down from the server page
}

// --- COMPONENT ---
export default function SearchBar({ query }: SearchBarProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Starts from the URL so a reload keeps the text. After that, the input
  // owns its own value while the person types.
  const [search, setSearch] = useState(query.search ?? "");

  // Waits 400ms after the last keystroke, then updates the URL.
  const updateUrl = useDebouncedCallback((value: string) => {
    startTransition(() => {
      // replace (not push): every keystroke-search would otherwise add a
      // history entry and make the Back button useless.
      // page: 1 -> a new search always starts from the first page.
      router.replace(
        buildProductsHref({
          ...query,
          search: value.trim() || undefined,
          page: 1,
        }),
      );
    });
  }, 400);

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    setSearch(e.target.value);
    updateUrl(e.target.value);
  }

  // --- RENDER ---
  return (
    <div className={styles.wrapper} role="search">
      <input
        id="product-search"
        type="text"
        value={search}
        onChange={handleChange}
        placeholder="Search products..."
        className={`${styles.input} ${isPending ? styles.inputPending : ""}`}
        aria-label="Search for resin art products"
        aria-busy={isPending}
        autoComplete="off"
        maxLength={100}
      />

      {/* a11y: aria-live makes screen readers announce the status */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className={styles.statusContainer}
      >
        {isPending && <span className={styles.status}>Searching...</span>}
      </div>
    </div>
  );
}
