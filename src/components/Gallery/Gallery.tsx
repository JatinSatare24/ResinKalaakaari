/**
 * GALLERY COMPONENT
 * Masonry grid of the products the owner flagged for the gallery.
 * Async Server Component: fetched on the server, streamed in by <Suspense>.
 */

// --- IMPORTS ---
import Image from "next/image";
import Link from "next/link";
import { getGalleryProducts } from "@/lib/data/products";
import type { GalleryItem } from "@/lib/types";
import styles from "@/components/Gallery/Gallery.module.css";

// --- COMPONENT ---
export default async function Gallery() {
  let products: GalleryItem[];

  try {
    products = await getGalleryProducts();
  } catch (error) {
    // The gallery is decoration: if it fails, hide it instead of breaking
    // the landing page.
    console.error(error);
    return null;
  }

  if (products.length === 0) return null;

  // --- MAIN RENDER ---
  return (
    <section
      className={styles.gallerySection}
      id="gallery"
      aria-labelledby="gallery-heading"
    >
      <h2 id="gallery-heading" className={styles.heading}>
        Artistry in Resin
      </h2>

      <ul className={styles.masonry}>
        {products.map((product) => (
          <li key={product.id} className={styles.item}>
            {/* aria-label stops screen readers reading the name twice
                (once from the image alt, once from the caption). */}
            <Link
              href={`/products/${product.slug}`}
              className={styles.link}
              aria-label={`View details for ${product.name}`}
            >
              <figure className={styles.imageWrapper}>
                <Image
                  src={product.image_url}
                  alt={`Handcrafted resin piece: ${product.name}`}
                  width={600}
                  height={800}
                  // Masonry columns: 2 on phones, 3 on tablets, 4 on desktop.
                  sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                  className={styles.image}
                />

                <figcaption className={styles.overlay}>
                  <span className={styles.title}>{product.name}</span>
                </figcaption>
              </figure>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
