"use client"

// import { products } from '@/data/products'
import { useState, useEffect, useContext } from 'react'
import { CartContext } from "@/context/CartContext"
import { useParams } from 'next/navigation'
import ProductDetail from '@/components/ProductDetails/ProductDetail'
import { supabase } from '@/lib/supabase'


type product = {
    id: string;
    name: string;
    description: string;
    price: number;
    image_url: string;
    slug: string;
}

export default function productDetail() {

    const { slug } = useParams()
    const { addToCart } = useContext(CartContext)!

    const [product, setProduct] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {

        const fetchProduct = async () => {
            const { data, error } = await supabase
                .from('products')
                .select(`
                     *,
                      categories!inner (
                       id,
                     name,
                      slug
                         )
                             `)
                .eq('slug', slug)
                .single();

            if (error) {
                console.error('Error fetching product: ', error.message)
                setProduct(null)
            } else {
                setProduct(data)
            }

            setLoading(false)
        }

        if (slug) {
            fetchProduct()
        }

    }, [slug])

    if (loading) {
        return <p>Loading product...</p>
    }

    if (!product) {
        return (
            <p>product not found!</p>
        )
    }
    return (
        <main>
            <ProductDetail addToCart={addToCart} product={product} />
        </main>

    )
}