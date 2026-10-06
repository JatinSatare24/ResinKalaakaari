// --- IMPORTS ---
import Image from "next/image";
import AddToCartButton from "@/components/AddToCartButton/AddToCartButton";
import Breadcrumb from "@/components/BreadCrumbNavigation/BreadCrumbNavigation";
import type { ProductWithCategory } from "@/lib/types";
import styles from "@/components/ProductDetails/ProductDetail.module.css";

// --- INTERFACES ---
export interface ProductDetailProps {
  product: ProductWithCategory;
}

// --- COMPONENT ---
// A Server Component now: it only displays data. The one interactive part
// (the button) is its own client component.
export default function ProductDetail({ product }: ProductDetailProps) {
  return (
    // The root layout already wraps every page in <main>, so this is a div.
    <div
      className={styles.container}
      aria-label={`Product details for ${product.name}`}
    >
      <Breadcrumb
        categoryName={product.categories?.name}
        categorySlug={product.categories?.slug}
        productName={product.name}
      />

      <article className={styles.productLayout} aria-labelledby="product-title">
        <figure className={styles.imageWrapper}>
          {/* This image is at the top of the page, so load it right away
              instead of lazily. */}
          <Image
            src={product.image_url}
            alt={product.name}
            width={900}
            height={900}
            sizes="(min-width: 1024px) 50vw, 100vw"
            loading="eager"
            fetchPriority="high"
          />
        </figure>

        <section className={styles.content}>
          <h1 id="product-title" className={styles.name}>
            {product.name}
          </h1>

          <p className={styles.price} aria-label={`Price: ₹${product.price}`}>
            ₹{product.price}
          </p>

          <p className={styles.description}>{product.description}</p>

          <AddToCartButton
            product={{
              id: product.id,
              name: product.name,
              slug: product.slug,
              price: product.price,
              image_url: product.image_url,
            }}
          />
        </section>
      </article>
    </div>
  );
}
