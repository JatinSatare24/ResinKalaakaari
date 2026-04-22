/**
 * CATEGORIES FILTER COMPONENT
 * Renders a horizontal, scrollable list of category links for filtering products.
 */

// --- IMPORTS ---
import React from 'react';
import Link from 'next/link';
import styles from '@/components/CategoryFilter/CategoryFilter.module.css';

// --- INTERFACES ---
export interface Category {
    id: string | number;
    name: string;
    slug: string;
}

export interface CategoriesFilterProps {
    categories: Category[];
}

// --- COMPONENT ---
export default function CategoriesFilter({ categories }: CategoriesFilterProps) {

    // --- RENDER ---
    return (
        <nav
            className={styles.container}
            aria-label="Product categories"
        >
            {/* 1. Default 'All' Category Link */}
            <Link
                href={'/products'}
                className={styles.link}
                aria-label="Show all products"
            >
                <p className={styles.name}>All</p>
            </Link>

            {/* 2. Dynamic Category Links */}
            {categories.map((category) => (
                <Link
                    href={`/products?category=${category.slug}`}
                    key={category.id}
                    className={styles.link}
                    aria-label={`Filter by ${category.name}`}
                >
                    <p className={styles.name}>{category.name}</p>
                </Link>
            ))}
        </nav>
    );
}