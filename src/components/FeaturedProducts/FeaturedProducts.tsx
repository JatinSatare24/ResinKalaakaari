'use client'

// --- IMPORTS ---
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from "lucide-react";
import { client } from '@/lib/supabase';

// Components
import ProductCard from '../ProductCard/ProductCard';
import Loader from '@/components/Spinner/Spinner';
import styles from '@/components/FeaturedProducts/FeaturedProducts.module.css';

// --- INTERFACES ---
export interface Product {
    id: string;
    name: string;
    description: string;
    price: number;
    image_url: string;
    slug: string;
}

// --- COMPONENT ---
export default function FeaturedProducts() {
    // --- STATE ---
    const supabase = client();
    const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // --- LIFECYCLE & DATA FETCHING ---
    useEffect(() => {
        const fetchFeaturedProducts = async () => {
            try {
                const { data, error } = await supabase
                    .from('products')
                    .select('*')
                    .eq('is_featured', true)
                    .limit(6)
                    .order('created_at', { ascending: false });

                if (error) {
                    throw error;
                } else {
                    setFeaturedProducts(data as Product[] || []);
                }
            } catch (err: any) {
                console.error('Error fetching featured products: ', err.message);
                setError('Failed to load featured products!');
            } finally {
                setLoading(false);
            }
        }

        fetchFeaturedProducts();
    }, [supabase]);

    // --- RENDER GUARDS ---
    if (loading) {
        return <Loader message={'Loading Featured products'} />;
    }

    if (error) {
        return <p className={styles.message} role="alert">{error}</p>;
    }

    if (featuredProducts.length === 0) {
        return null;
    }

    // --- MAIN RENDER ---
    return (
        <section
            className={styles.featuredSection}
            id='featuredProducts'
            aria-labelledby="featured-heading"
        >
            {/* --- HEADER --- */}
            <h2 id="featured-heading" className={styles.heading}>Featured Products</h2>

            {/* --- PRODUCT GRID --- */}
            <div className={styles.grid} role="list">
                {featuredProducts.map((product) => (
                    <div key={product.id} role="listitem">
                        <ProductCard product={product} />
                    </div>
                ))}

                {/* --- CALL TO ACTION --- */}
                <div className={styles.viewAllContainer}>
                    <Link
                        href="/products"
                        className={styles.viewAllButton}
                        aria-label="View all handcrafted products"
                    >
                        View All <ArrowRight size={18} className={styles.icon} aria-hidden="true" />
                    </Link>
                </div>
            </div>
        </section>
    );
}