'use client'

// --- IMPORTS ---
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight } from "lucide-react";
import { client } from '@/lib/supabase';
import Loader from '@/components/Spinner/Spinner';
import styles from '@/components/ShopByCategory/ShopByCategory.module.css';

// --- INTERFACES ---
export interface Category {
    id: number;
    name: string;
    slug: string;
}

// --- COMPONENT ---
export default function ShopByCategory() {
    // --- STATE ---
    const supabase = client();
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // --- DATA FETCHING & LIFECYCLE ---
    useEffect(() => {
        const fetchShopByCategory = async () => {
            try {
                const { data, error } = await supabase
                    .from('categories')
                    .select('id, name, slug')
                    .limit(7);

                if (error) {
                    throw error;
                } else {
                    setCategories(data || []);
                }
            } catch (err: any) {
                console.error('Error fetching shopping Categories: ', err.message);
                setError('Failed to load Shop by categories');
            } finally {
                setLoading(false);
            }
        };

        fetchShopByCategory();
    }, [supabase]);

    // --- RENDER GUARDS ---
    if (loading) return <Loader message={'Loading art categories'} />;
    if (error) return <p className={styles.message} role="alert">{error}</p>;
    if (categories.length === 0) return null

    // --- MAIN RENDER ---
    return (
        <section className={styles.shopByCategoryContainer} aria-labelledby="category-heading">
            {/* --- SECTION HEADER --- */}
            <h2 id="category-heading" className={styles.heading}>Shop by Category</h2>

            {/* --- CATEGORY GRID --- */}
            <div className={styles.grid} role="list">
                {categories.map((category) => (
                    <Link
                        key={category.id}
                        href={`/products?category=${category.slug}`}
                        className={styles.categoryCard}
                        aria-label={`Shop products in ${category.name}`}
                        role="listitem"
                    >
                        {category.name}
                    </Link>
                ))}
            </div>

            {/* --- CALL TO ACTION --- */}
            <div className={styles.viewAllContainer}>
                <Link
                    href="/products"
                    className={styles.viewAllButton}
                    aria-label="View all product categories"
                >
                    View All <ArrowRight size={18} className={styles.icon} aria-hidden="true" />
                </Link>
            </div>
        </section>
    );
}