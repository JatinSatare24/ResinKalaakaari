import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ProductDetail from "@/components/ProductDetails/ProductDetail";
import ProductCard from "@/components/ProductCard/ProductCard";
import styles from "@/components/ProductDetails/ProductDetail.module.css";
import { getProductBySlug, getRelatedProducts } from "@/lib/data/products";

// Next 16: params is a Promise. `slug` comes from the folder name [slug].
type Props = { params: Promise<{ slug: string }> };

// Sets the browser tab title + link preview for this product.
// getProductBySlug is wrapped in cache(), so calling it here AND in the page
// below still runs only one database query per request.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) return { title: "Product not found | Resin Kalaakaari" };

  return {
    title: `${product.name} | Resin Kalaakaari`,
    description: product.description?.slice(0, 160) ?? undefined,
    openGraph: { images: [product.image_url] },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  // No product with this slug -> renders not-found.tsx from this folder.
  // (notFound() never returns, so `product` is non-null below.)
  if (!product) notFound();

  // Needs product.category_id, so it has to wait for the query above.
  const relatedProducts = product.category_id
    ? await getRelatedProducts(product.category_id, product.id)
    : [];

  return (
    <>
      <ProductDetail product={product} />

      {relatedProducts.length > 0 && (
        <section className={styles.relatedProductsContainer}>
          <h2 className={styles.relatedProductsTitle}>Related Products</h2>
          <div className={styles.relatedProducts}>
            {relatedProducts.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
