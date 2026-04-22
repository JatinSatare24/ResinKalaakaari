// --- IMPORTS ---
import React from 'react';
import Link from 'next/link';
import styles from '@/components/ProductCard/ProductCard.module.css';

// --- INTERFACES ---
export interface Product {
    name: string;
    slug: string;
    image_url: string;
    price: number;
}

export interface ProductCardProps {
    product: Product;
}

// --- COMPONENT ---
export default function ProductCard({ product }: ProductCardProps) {
    // --- RENDER ---
    return (
        <Link
            className={styles.link}
            href={`/products/${product.slug}`}
            aria-label={`View details for ${product.name}`}
        >
            <article className={styles.card}>

                {/* --- PRODUCT IMAGE --- */}
                <img
                    className={styles.image}
                    src={product.image_url}
                    alt={`Image of ${product.name}`}
                    loading="lazy"
                />

                {/* --- PRODUCT CONTENT --- */}
                <header className={styles.content}>
                    <h2 className={styles.name}>{product.name}</h2>
                    <p className={styles.price}>₹{product.price}</p>
                </header>

            </article>
        </Link>
    );
}