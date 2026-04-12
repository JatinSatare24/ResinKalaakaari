'use client'

import styles from '@/components/ShopByCategory/ShopByCategory.module.css'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { ArrowRight } from "lucide-react";
import Link from 'next/link';

type Category = {
    id: number,
    name: string,
    slug: string
}

export default function ShopByCategory() {

    const [ShopByCategory, setShopByCategory] = useState<Category[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {

        const fetchShopByCategory = async () => {
            const { data, error } = await supabase
                .from('categories')
                .select('id, name, slug')
                .limit(7)

            if (error) {
                console.error('Error fetching shopping Categories: ', error.message)
                setError('Failed to load Shop by categories')
            } else {
                setShopByCategory(data || [])
            }

            setLoading(false)
        }



        fetchShopByCategory()

    }, [])

    if (loading) return <p className={styles.message}>Loading categories...</p>;
    if (error) return <p className={styles.message}>{error}</p>;

    return (
        <section className={styles.shopByCategoryContainer}>
            <h2 className={styles.heading}>Shop by Category</h2>

            <div className={styles.grid}>
                {ShopByCategory.map((category) => (
                    <Link
                        key={category.id}
                        href={`/products?category=${category.slug}`}
                        className={styles.categoryCard}
                    >
                        {category.name}
                    </Link>
                ))}
            </div>

            <div className={styles.viewAllContainer}>
                <Link href="/products" className={styles.viewAllButton}>
                    View All <ArrowRight size={18} className={styles.icon} />
                </Link>
            </div>
        </section>
    )
}