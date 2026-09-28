import type { Metadata } from "next";
import { redirect } from "next/navigation";
import ProductCard from "@/components/ProductCard/ProductCard";
import styles from "@/components/ProductCard/ProductCard.module.css";
import CategoriesFilter from "@/components/CategoryFilter/CategoryFilter";
import SearchBar from "@/components/SearchBar/SearchBar";
import SortDropdown from "@/components/SortDropdown/SortDropdown";
import PaginationControls from "@/components/PaginationControls/PaginationControls";
import Breadcrumb from "@/components/BreadCrumbNavigation/BreadCrumbNavigation";
import { getCategories } from "@/lib/data/categories";
import { getProducts } from "@/lib/data/products";
import { PRODUCTS_PER_PAGE } from "@/lib/constants";
import {
  buildProductsHref,
  parseProductsQuery,
  type RawSearchParams,
} from "@/lib/search-params";

export const metadata: Metadata = {
  title: "Shop Handcrafted Resin Art | Resin Kalaakaari",
  description:
    "Browse handcrafted resin art: varmala preservation, custom nameplates, jewelry and more.",
};

export default async function ProductsPage({
  searchParams,
}: {
  // Next 16: a Promise, so it must be awaited. Reading it makes this page
  // dynamic (rendered per request), which is right for a filterable list.
  searchParams: Promise<RawSearchParams>;
}) {
  // Clean the URL once, here. Everything below gets safe, typed values.
  const query = parseProductsQuery(await searchParams);

  // Both throw on failure -> app/error.tsx catches it.
  // Promise.all runs the two requests at the same time.
  const [{ products, totalCount }, categories] = await Promise.all([
    getProducts(query),
    getCategories(),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PRODUCTS_PER_PAGE));

  // ?page=999 (old bookmark, hand-typed URL): go to the last real page.
  // redirect() throws on purpose, so it must not sit inside a try/catch.
  if (query.page > totalPages) {
    redirect(buildProductsHref({ ...query, page: totalPages }));
  }

  const selectedCategory = categories.find((c) => c.slug === query.category);

  return (
    // The root layout already wraps every page in <main>, so this is a div.
    <div className={styles.productContainer}>
      <Breadcrumb
        categoryName={selectedCategory?.name}
        categorySlug={selectedCategory?.slug}
      />

      <CategoriesFilter categories={categories} query={query} />
      <SearchBar query={query} />

      <div className={styles.SortContainer}>
        <SortDropdown query={query} />
        <p className={styles.productCount}>
          {totalCount} {totalCount === 1 ? "product" : "products"}
        </p>
      </div>

      <div className={styles.productGrid}>
        {products.length > 0 ? (
          products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))
        ) : (
          <div className={styles.noResultsContainer}>
            <p className={styles.noResults}>
              No products matched🙁. Try a different keyword.
            </p>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <PaginationControls query={query} totalPages={totalPages} />
      )}
    </div>
  );
}
