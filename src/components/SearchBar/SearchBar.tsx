"use client";

/**
 * SEARCH BAR COMPONENT
 * Debounced search box, used by the shop and by the admin products list.
 * Writes ?search= into the URL; the server page reads it and fetches the
 * matches.
 *
 * It takes plain data, not a link-building function: a Server Component can
 * pass strings and objects to a Client Component, but not functions.
 * `basePath` is the page to stay on, `keep` the other URL params to carry along.
 */

// --- IMPORTS ---
import { useState, useTransition } from "react";
import type { ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { useDebouncedCallback } from "use-debounce";
import { buildSearchHref } from "@/lib/search-params";
import styles from "./SearchBar.module.css";

// --- INTERFACES ---
export interface SearchBarProps {
  basePath: string; // the page to search on, e.g. "/products"
  keep?: Record<string, string | undefined>; // other params to carry along (category, sort)
  initialValue?: string; // the current ?search= from the URL
  placeholder?: string;
  label?: string; // what a screen reader announces for the box
}

// --- COMPONENT ---
export default function SearchBar({
  basePath,
  keep = {},
  initialValue = "",
  placeholder = "Search products...",
  label = "Search for resin art products",
}: SearchBarProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Starts from the URL so a reload keeps the text. After that, the input
  // owns its own value while the person types.
  const [search, setSearch] = useState(initialValue);

  // Waits 400ms after the last keystroke, then updates the URL.
  const updateUrl = useDebouncedCallback((value: string) => {
    startTransition(() => {
      // replace (not push): every keystroke-search would otherwise add a
      // history entry and make the Back button useless.
      // No page given -> a new search always starts from the first page.
      router.replace(
        buildSearchHref(basePath, {
          ...keep,
          search: value.trim() || undefined,
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
        placeholder={placeholder}
        className={`${styles.input} ${isPending ? styles.inputPending : ""}`}
        aria-label={label}
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
