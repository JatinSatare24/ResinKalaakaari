import Image from "next/image";
import Link from "next/link";
import styles from "@/components/Gallery/Gallery.module.css";
import { client } from "@/lib/supabase";

type GalleryItem = {
    id: string;
    name: string;
    slug: string;
    image_url: string;
    gallery_order: number;
};

export default async function Gallery() {

    const supabase = client()

    const { data: products, error } = await supabase
        .from("products")
        .select("id, name, slug, image_url, gallery_order")
        .eq("is_gallery", true)
        .order("gallery_order", { ascending: true });

    if (error) {
        console.error("Error fetching gallery images:", error.message);
        return null;
    }

    if (!products || products.length === 0) {
        return null;
    }

    return (
        <section className={styles.gallerySection}>
            <div className="container">
                <h2 className={styles.heading}>Artistry in Resin</h2>

                <div className={styles.masonry}>
                    {products.map((product: GalleryItem) => (
                        <Link
                            key={product.id}
                            href={`/products/${product.slug}`}
                            className={styles.item}
                        >
                            <div className={styles.imageWrapper}>
                                <Image
                                    src={product.image_url}
                                    alt={product.name}
                                    width={600}
                                    height={800}
                                    className={styles.image}
                                />
                                <div className={styles.overlay}>
                                    <span className={styles.title}>{product.name}</span>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
}