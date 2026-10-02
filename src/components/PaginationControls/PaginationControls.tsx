// --- IMPORTS ---
import Link from "next/link";
import styles from "@/components/PaginationControls/PaginationControls.module.css";

// --- INTERFACES ---
export interface PaginationControlsProps {
  page: number; // current page, 1-based
  totalPages: number;
  // Turns a page number into a URL, so the same controls serve the products
  // page (keeps filters in the link) and the admin list.
  buildHref: (page: number) => string;
}

// --- COMPONENT ---
// Plain links, no client state: each button is just a URL with ?page=N.
export default function PaginationControls({
  page,
  totalPages,
  buildHref,
}: PaginationControlsProps) {
  return (
    <nav className={styles.nav} aria-label="Pagination">
      {page > 1 ? (
        <Link href={buildHref(page - 1)} className={styles.button} rel="prev">
          ←
        </Link>
      ) : (
        <span className={`${styles.button} ${styles.disabled}`}>←</span>
      )}

      <p className={styles.status} aria-current="page">
        {page} / {totalPages}
      </p>

      {page < totalPages ? (
        <Link href={buildHref(page + 1)} className={styles.button} rel="next">
          →
        </Link>
      ) : (
        <span className={`${styles.button} ${styles.disabled}`}>Next →</span>
      )}
    </nav>
  );
}
