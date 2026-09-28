// --- IMPORTS ---
import Image from "next/image";
import Link from "next/link";
import type { ProductSummary } from "@/lib/types";
import styles from "@/components/ProductCard/ProductCard.module.css";

// --- INTERFACES ---
export interface ProductCardProps {
  product: ProductSummary;
}

// --- COMPONENT ---
export default function ProductCard({ product }: ProductCardProps) {
  return (
    <Link
      className={styles.link}
      href={`/products/${product.slug}`}
      aria-label={`View details for ${product.name}`}
    >
      <article className={styles.card}>
        {/* next/image resizes + compresses the picture and lazy-loads it.
            width/height only reserve the space; CSS controls the real size. */}
        <Image
          className={styles.image}
          src={product.image_url}
          alt={`Image of ${product.name}`}
          width={600}
          height={600}
          sizes="(min-width: 1280px) 16vw, (min-width: 768px) 33vw, 50vw"
        />

        <header className={styles.content}>
          <h2 className={styles.name}>{product.name}</h2>
          <p className={styles.price}>₹{product.price}</p>
        </header>
      </article>
    </Link>
  );
}
