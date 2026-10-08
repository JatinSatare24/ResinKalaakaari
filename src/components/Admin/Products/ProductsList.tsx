// --- IMPORTS ---
import Image from "next/image";
import Link from "next/link";
import RebuildIndexButton from "@/components/Admin/Products/RebuildIndexButton";
import PaginationControls from "@/components/PaginationControls/PaginationControls";
import SearchBar from "@/components/SearchBar/SearchBar";
import { buildAdminProductsHref } from "@/lib/search-params";
import type { AdminProduct } from "@/lib/types";
import styles from "@/components/Admin/Products/Products.module.css";

// --- INTERFACES ---
export interface AdminProductsListProps {
  products: AdminProduct[];
  search?: string;
  page: number;
  totalPages: number;
  totalCount: number;
  showRebuildIndex?: boolean; // the AI assistant is on
}

// --- COMPONENT ---
// Server Component: plain HTML cards. The only client piece is the search
// box. The role check lives in the page (requireAdmin), not here.
export default function AdminProductsList({
  products,
  search,
  page,
  totalPages,
  totalCount,
  showRebuildIndex = false,
}: AdminProductsListProps) {
  return (
    <section className={styles.wrapper} aria-labelledby="admin-products-title">
      <div className={styles.header}>
        <h1 id="admin-products-title" className={styles.title}>
          Products
        </h1>
        <Link href="/admin/products/new" className={styles.addButton}>
          Add product
        </Link>
      </div>

      <p className={styles.summary}>
        {search
          ? `${totalCount} ${totalCount === 1 ? "match" : "matches"} for "${search}"`
          : `${totalCount} ${totalCount === 1 ? "product" : "products"}, A to Z`}
      </p>

      {showRebuildIndex && <RebuildIndexButton />}

      <SearchBar
        basePath="/admin/products"
        initialValue={search}
        placeholder="Search by product name..."
        label="Search products by name"
      />

      {products.length === 0 ? (
        <p className={styles.empty}>
          {search
            ? "No product has that name. Try fewer letters."
            : "No products yet. Tap Add product to create the first one."}
        </p>
      ) : (
        <ul className={styles.list}>
          {products.map((product) => (
            <li key={product.id} className={styles.card}>
              <Image
                src={product.image_url}
                alt=""
                width={72}
                height={72}
                className={styles.thumb}
              />

              <div className={styles.info}>
                <p className={styles.name}>{product.name}</p>
                <p className={styles.meta}>
                  ₹{product.price.toLocaleString("en-IN")}
                  {product.categories ? ` · ${product.categories.name}` : ""}
                </p>
                {(product.is_featured || product.is_gallery) && (
                  <p className={styles.badges}>
                    {product.is_featured && (
                      <span className={styles.badge}>Featured</span>
                    )}
                    {product.is_gallery && (
                      <span className={styles.badge}>Gallery</span>
                    )}
                  </p>
                )}
              </div>

              <Link
                href={`/admin/products/${product.id}/edit`}
                className={styles.editButton}
                aria-label={`Edit ${product.name}`}
              >
                Edit
              </Link>
            </li>
          ))}
        </ul>
      )}

      {totalPages > 1 && (
        <PaginationControls
          page={page}
          totalPages={totalPages}
          buildHref={(p) => buildAdminProductsHref({ search, page: p })}
        />
      )}
    </section>
  );
}
