// --- IMPORTS ---
import Link from "next/link";
import { FiArrowRight } from "react-icons/fi";
import ProductCard from "@/components/ProductCard/ProductCard";
import { getFeaturedProducts } from "@/lib/data/products";
import type { ProductSummary } from "@/lib/types";
import styles from "@/components/FeaturedProducts/FeaturedProducts.module.css";

// --- COMPONENT ---
// An async Server Component: it fetches on the server, so no useEffect, no
// loading state, and the products are already in the HTML. The home page
// wraps it in <Suspense> so it can stream in after the Hero.
export default async function FeaturedProducts() {
  let products: ProductSummary[];

  try {
    products = await getFeaturedProducts();
  } catch (error) {
    // On the home page one broken section should not take the whole page
    // down, so we catch here instead of letting error.tsx replace the page.
    console.error(error);
    return (
      <p className={styles.message} role="alert">
        Failed to load featured products.
      </p>
    );
  }

  if (products.length === 0) return null;

  // --- MAIN RENDER ---
  return (
    <section
      className={styles.featuredSection}
      id="featuredProducts"
      aria-labelledby="featured-heading"
    >
      <h2 id="featured-heading" className={styles.heading}>
        Featured Products
      </h2>

      {/* A real list (ul/li) so screen readers announce "list, 7 items". */}
      <ul className={styles.grid}>
        {products.map((product) => (
          <li key={product.id}>
            <ProductCard product={product} />
          </li>
        ))}

        {/* --- CALL TO ACTION --- */}
        <li className={styles.viewAllContainer}>
          <Link href="/products" className={styles.viewAllButton}>
            View All <FiArrowRight className={styles.icon} aria-hidden="true" />
          </Link>
        </li>
      </ul>
    </section>
  );
}
