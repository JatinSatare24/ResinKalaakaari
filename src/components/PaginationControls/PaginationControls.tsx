// --- IMPORTS ---
import Link from "next/link";
import { buildProductsHref, type ProductsQuery } from "@/lib/search-params";
import styles from "@/components/PaginationControls/PaginationControls.module.css";

// --- INTERFACES ---
export interface PaginationControlsProps {
  query: ProductsQuery; // current filters, kept in the links
  totalPages: number;
}

// --- COMPONENT ---
// Plain links, no client state: each button is just a URL with ?page=N.
export default function PaginationControls({
  query,
  totalPages,
}: PaginationControlsProps) {
  const { page } = query;

  return (
    <nav className={styles.nav} aria-label="Pagination">
      {page > 1 ? (
        <Link
          href={buildProductsHref({ ...query, page: page - 1 })}
          className={styles.button}
          rel="prev"
        >
          ← 
        </Link>
      ) : (
        <span className={`${styles.button} ${styles.disabled}`}>
          ←
        </span>
      )}

      <p className={styles.status} aria-current="page">
         {page} / {totalPages}
      </p>

      {page < totalPages ? (
        <Link
          href={buildProductsHref({ ...query, page: page + 1 })}
          className={styles.button}
          rel="next"
        >
          →
        </Link>
      ) : (
        <span className={`${styles.button} ${styles.disabled}`}>Next →</span>
      )}
    </nav>
  );
}
