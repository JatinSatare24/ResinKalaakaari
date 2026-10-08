// --- IMPORTS ---
import AddCategoryForm from "@/components/Admin/Categories/AddCategoryForm";
import CategoryRow from "@/components/Admin/Categories/CategoryRow";
import type { AdminCategory } from "@/lib/types";
import styles from "@/components/Admin/Categories/Categories.module.css";

// --- INTERFACES ---
export interface AdminCategoriesListProps {
  categories: AdminCategory[];
}

// --- COMPONENT ---
// Server Component. The two forms are the only client pieces. There is no
// delete on purpose: a category that holds products can't be removed.
export default function AdminCategoriesList({
  categories,
}: AdminCategoriesListProps) {
  return (
    <section
      className={styles.wrapper}
      aria-labelledby="admin-categories-title"
    >
      <h1 id="admin-categories-title" className={styles.title}>
        Categories
      </h1>
      <p className={styles.summary}>
        {categories.length}{" "}
        {categories.length === 1 ? "category" : "categories"}
      </p>

      <AddCategoryForm />

      {categories.length === 0 ? (
        <p className={styles.empty}>
          No categories yet. Add the first one above.
        </p>
      ) : (
        <ul className={styles.list}>
          {categories.map((category) => (
            <CategoryRow key={category.id} category={category} />
          ))}
        </ul>
      )}
    </section>
  );
}
