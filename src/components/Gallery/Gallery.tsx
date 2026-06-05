/**
 * GALLERY COMPONENT
 * Renders a high-end masonry grid of featured resin art products.
 * Server-side fetched for optimal SEO and performance.
 */

// --- IMPORTS ---
import React from "react";
import Image from "next/image";
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/server";
import styles from "@/components/Gallery/Gallery.module.css";

// --- INTERFACES ---
export interface GalleryItem {
    id: string;
    name: string;
    slug: string;
    image_url: string;
    gallery_order: number;
}

// --- COMPONENT ---
export default async function Gallery() {
    // --- UTILS & CLIENTS ---
const supabase = await createServerSupabaseClient()

    // --- DATA FETCHING ---
    // Wrapped in a try/catch for server-side reliability
    let products: GalleryItem[] = [];

    try {
        const { data, error } = await supabase
            .from("products")
            .select("id, name, slug, image_url, gallery_order")
            .eq("is_gallery", true)
            .order("gallery_order", { ascending: true });

        if (error) throw error;
        products = data as GalleryItem[] || [];
    } catch (err: unknown) {
        console.error("Gallery Fetch Exception:", err);
        // Fail silently to avoid breaking the landing page
        return null;
    }

    // --- RENDER GUARDS ---
    if (products.length === 0) {
        return null;
    }

    // --- MAIN RENDER ---
    return (
        <section
            className={styles.gallerySection}
            id='gallery'
            aria-labelledby="gallery-heading"
        >
            {/* Note: 'container' is retained as a global class per protocol */}
            <div className="container">

                {/* --- HEADER --- */}
                <h2 id="gallery-heading" className={styles.heading}>
                    Artistry in Resin
                </h2>

                {/* --- MASONRY GRID --- */}
                <div className={styles.masonry} role="list">
                    {products.map((product) => (
                        <Link
                            key={product.id}
                            href={`/products/${product.slug}`}
                            className={styles.item}
                            aria-label={`View details for ${product.name}`}
                            role="listitem"
                        >
                            <figure className={styles.imageWrapper} style={{ margin: 0 }}>
                                <Image
                                    src={product.image_url}
                                    alt={`Handcrafted resin piece: ${product.name}`}
                                    width={600}
                                    height={800}
                                    className={styles.image}
                                    loading="lazy"
                                />

                                {/* --- IMAGE OVERLAY / CAPTION --- */}
                                <figcaption className={styles.overlay}>
                                    <span className={styles.title}>{product.name}</span>
                                </figcaption>
                            </figure>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
}