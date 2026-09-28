/**
 * CATEGORIES FILTER COMPONENT
 * Renders a horizontal, scrollable list of category links for filtering products.
 * The links keep the current search and sort, and reset the page to 1.
 */

// --- IMPORTS ---
import Link from "next/link";
import { buildProductsHref, type ProductsQuery } from "@/lib/search-params";
import type { Category } from "@/lib/types";
import styles from "@/components/CategoryFilter/CategoryFilter.module.css";

// --- INTERFACES ---
export interface CategoriesFilterProps {
  categories: Category[];
  query: ProductsQuery; // current URL state (which category is active, etc.)
}

// --- COMPONENT ---
export default function CategoriesFilter({
  categories,
  query,
}: CategoriesFilterProps) {
  const { search, sort } = query;

  return (
    <nav className={styles.container} aria-label="Product categories">
      {/* 1. Default 'All' link */}
      <Link
        href={buildProductsHref({ search, sort })}
        className={styles.link}
        aria-current={!query.category ? "true" : undefined}
      >
        <p className={`${styles.name} ${!query.category ? styles.active : ""}`}>
          All
        </p>
      </Link>

      {/* 2. One link per category */}
      {categories.map((category) => {
        const isActive = category.slug === query.category;
        return (
          <Link
            href={buildProductsHref({ category: category.slug, search, sort })}
            key={category.id}
            className={styles.link}
            aria-current={isActive ? "true" : undefined}
          >
            <p className={`${styles.name} ${isActive ? styles.active : ""}`}>
              {category.name}
            </p>
          </Link>
        );
      })}
    </nav>
  );
}
