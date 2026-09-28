"use client";

/**
 * SORT DROPDOWN COMPONENT
 * Writes ?sort= into the URL; the server page reads it.
 * The options come from PRODUCT_SORTS, the same list the data layer uses.
 */

// --- IMPORTS ---
import { useState, useTransition } from "react";
import type { ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import {
  PRODUCT_SORTS,
  isProductSort,
  type ProductSort,
} from "@/lib/product-sorts";
import { buildProductsHref, type ProductsQuery } from "@/lib/search-params";
import styles from "@/components/SortDropdown/SortDropdown.module.css";

// --- INTERFACES ---
export interface SortDropdownProps {
  query: ProductsQuery; // current URL state, passed down from the server page
}

const SORT_KEYS = Object.keys(PRODUCT_SORTS) as ProductSort[];

// --- COMPONENT ---
export default function SortDropdown({ query }: SortDropdownProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [value, setValue] = useState<string>(query.sort ?? "");

  function handleSort(e: ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value;
    setValue(next);

    startTransition(() => {
      // page: 1 -> a new sort order always starts from the first page.
      router.push(
        buildProductsHref({
          ...query,
          sort: isProductSort(next) ? next : undefined,
          page: 1,
        }),
      );
    });
  }

  // --- RENDER ---
  return (
    <div className={styles.sortWrapper}>
      <select
        id="product-sort"
        onChange={handleSort}
        className={styles.select}
        value={value}
        aria-label="Sort products by price or date"
        aria-busy={isPending}
      >
        <option value="">Sort by</option>
        {SORT_KEYS.map((key) => (
          <option key={key} value={key}>
            {PRODUCT_SORTS[key].label}
          </option>
        ))}
      </select>
    </div>
  );
}
