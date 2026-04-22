// --- IMPORTS ---
import React from 'react';
import styles from '@/components/ProductDetails/ProductDetail.module.css';
import Breadcrumb from '../BreadCrumbNavigation/BreadCrumbNavigation';

// --- INTERFACES ---
export interface ProductCategory {
    name: string;
    slug: string;
}

export interface Product {
    name: string;
    description: string;
    price: number;
    image_url: string;
    categories: ProductCategory;
}

export interface ProductDetailProps {
    product: Product;
    addToCart: (product: Product) => void;
}

// --- COMPONENT ---
export default function ProductDetail({ product, addToCart }: ProductDetailProps) {
    // --- RENDER ---
    return (
        <main className={styles.container} aria-label={`Product details for ${product.name}`}>

            {/* --- BREADCRUMB NAVIGATION --- */}
            <Breadcrumb
                categoryName={product.categories.name}
                categorySlug={product.categories.slug}
                productName={product.name}
            />

            {/* --- PRODUCT LAYOUT --- */}
            <article className={styles.productLayout} aria-labelledby="product-title">

                {/* --- PRODUCT IMAGE --- */}
                <figure className={styles.imageWrapper} style={{ margin: 0 }}>
                    <img
                        src={product.image_url}
                        alt={`High-quality view of ${product.name}`}
                        loading="lazy"
                    />
                </figure>

                {/* --- PRODUCT CONTENT --- */}
                <section className={styles.content}>
                    <h1 id="product-title" className={styles.name}>{product.name}</h1>

                    <p className={styles.price} aria-label={`Price: ₹${product.price}`}>
                        ₹{product.price}
                    </p>

                    <p className={styles.description}>
                        {product.description}
                    </p>

                    {/* --- ACTIONS --- */}
                    <button
                        className={styles.button}
                        onClick={() => addToCart(product)}
                        aria-label={`Add ${product.name} to your cart`}
                    >
                        Add to Cart
                    </button>
                </section>

            </article>
        </main>
    );
}