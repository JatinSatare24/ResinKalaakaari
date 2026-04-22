/**
 * BREADCRUMB NAVIGATION
 * Provides hierarchical site navigation for product pages.
 * Handles dynamic category and product name rendering.
 */

// --- IMPORTS ---
import React from "react";
import Link from "next/link";
import styles from '@/components/BreadCrumbNavigation/BreadCrumbNavigation.module.css';

// --- INTERFACES ---
export interface BreadcrumbProps {
    categoryName?: string;
    categorySlug?: string;
    productName?: string;
}

// --- COMPONENT ---
export default function Breadcrumb({
    categoryName,
    categorySlug,
    productName,
}: BreadcrumbProps) {

    // --- RENDER ---
    return (
        <nav aria-label="Breadcrumb" className={styles.breadcrumb}>

            {/* 1. Base Navigation */}
            <Link href="/">Home</Link>

            <span className={styles.separator} aria-hidden="true"> {' > '} </span>

            <Link href="/products">Products</Link>

            {/* 2. Conditional Category Level */}
            {categoryName && categorySlug && (
                <>
                    <span className={styles.separator} aria-hidden="true"> {' > '} </span>
                    <Link href={`/products?category=${categorySlug}`}>
                        {categoryName}
                    </Link>
                </>
            )}

            {/* 3. Conditional Product Level (Active Page) */}
            {productName && (
                <>
                    <span className={styles.separator} aria-hidden="true"> {' > '} </span>
                    <span
                        className={styles.activePage}
                        aria-current="page"
                    >
                        {productName}
                    </span>
                </>
            )}

        </nav>
    );
}