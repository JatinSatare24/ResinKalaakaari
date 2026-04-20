'use client'

import styles from '@/components/FeaturedProducts/FeaturedProducts.module.css'
import ProductCard from '../ProductCard/ProductCard';
import { client } from '@/lib/supabase'
import { useEffect, useState } from 'react';
import { ArrowRight } from "lucide-react";
import Link from 'next/link';
import Loader from '@/components/Spinner/Spinner'

type Product = {
    id: string;
    name: string;
    description: string;
    price: number;
    image_url: string;
    slug: string;
};

export default function FeaturedProducts() {
    const supabase = client()

    const [featuredProducts, setFeaturedProducts] = useState<Product[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const fetchFeaturedProducts = async () => {
            const { data, error } = await supabase
                .from('products')
                .select('*')
                .eq('is_featured', true)
                .limit(4)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching featured products: ', error.message)
                setError('Failed to load featured products!')
            } else {
                setFeaturedProducts(data || [])
            }

            setLoading(false)

        }

        fetchFeaturedProducts()
    }, [])

    if (loading) {
        return <Loader message={'Loading Featured products'}/>;
    }

    if (error) {
        return <p className={styles.message}>{error}</p>;
    }

    if (featuredProducts.length === 0) {
        return null;
    }

    return (
        <section className={styles.featuredSection} id='featuredProducts'>
            <h2 className={styles.heading}>Featured Products</h2>

            <div className={styles.grid}>
                {featuredProducts.map((product) => (
                    <ProductCard key={product.id} product={product} />
                ))}
                <div className={styles.viewAllContainer}>
                    <Link href="/products" className={styles.viewAllButton}>
                        View All <ArrowRight size={18} className={styles.icon} />
                    </Link>
                </div>
            </div>
        </section>
    )
}