// --- IMPORTS ---
import Link from "next/link";
import { FiArrowRight } from "react-icons/fi";
import { getCategories } from "@/lib/data/categories";
import { buildProductsHref } from "@/lib/search-params";
import type { Category } from "@/lib/types";
import styles from "@/components/ShopByCategory/ShopByCategory.module.css";

// How many category tiles the home page shows.
const HOME_CATEGORY_LIMIT = 7;

// --- COMPONENT ---
// An async Server Component, streamed in by <Suspense> on the home page.
export default async function ShopByCategory() {
  let categories: Category[];

  try {
    categories = await getCategories(HOME_CATEGORY_LIMIT);
  } catch (error) {
    // One broken section should not take the whole home page down.
    console.error(error);
    return (
      <p className={styles.message} role="alert">
        Failed to load categories.
      </p>
    );
  }

  // No categories -> render nothing, not an empty heading with no tiles.
  if (categories.length === 0) return null;

  // --- MAIN RENDER ---
  return (
    <section
      className={styles.shopByCategoryContainer}
      aria-labelledby="category-heading"
    >
      <h2 id="category-heading" className={styles.heading}>
        Shop by Category
      </h2>

      {/* ul/li, not role="listitem" on a link: that role would replace the
          link role, and screen readers would stop calling these links. */}
      <ul className={styles.grid}>
        {categories.map((category) => (
          <li key={category.id}>
            <Link
              href={buildProductsHref({ category: category.slug })}
              className={styles.categoryCard}
            >
              {category.name}
            </Link>
          </li>
        ))}
      </ul>

      {/* --- CALL TO ACTION --- */}
      <div className={styles.viewAllContainer}>
        <Link href="/products" className={styles.viewAllButton}>
          View All <FiArrowRight className={styles.icon} aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
