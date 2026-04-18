"use client"

// import { products } from '@/data/products'
import { useState, useEffect, useContext } from 'react'
import { CartContext } from "@/context/CartContext"
import { useParams } from 'next/navigation'
import ProductDetail from '@/components/ProductDetails/ProductDetail'
import styles from '@/components/ProductDetails/ProductDetail.module.css'
import ProductCard from '@/components/ProductCard/ProductCard'
import { client } from '@/lib/supabase'
import Loader from '@/components/Spinner/Spinner'


type product = {
    id: string;
    name: string;
    description: string;
    price: number;
    image_url: string;
    slug: string;
}

type Product = {
    id: string;
    name: string;
    description: string;
    price: number;
    image_url: string;
    slug: string;
    category_id: string;
};


export default function productDetail() {

    const supabase = client()

    const { slug } = useParams()
    const { addToCart } = useContext(CartContext)!

    const [product, setProduct] = useState(null)
    const [relatedProducts, setRelatedProducts] = useState<product[]>([]);
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

            const { data: relatedData, error: relatedError } = await supabase
                .from('products')
                .select('*')
                .eq('category_id', data.category_id)
                .neq('id', data.id)
                .limit(4);

            if (relatedError) {
                console.error(
                    'Error fetching related products:',
                    relatedError.message
                );
            } else {
                setRelatedProducts(relatedData || []);
            }

            setLoading(false)
        }

        if (slug) {
            fetchProduct()
        }

    }, [slug])


    if (loading) {
        return <Loader message={'Loading product details'}/>
    }

    if (!product) {
        return (
            <p>product not found!</p>
        )
    }
    return (
        <main>
            <ProductDetail addToCart={addToCart} product={product} />
            {relatedProducts.length > 0 && (
                <section className={styles.relatedProductsContainer}>
                    <h2 className={styles.relatedProductsTitle}>Related Products</h2>
                    <div className={styles.relatedProducts}>
                        {relatedProducts.map((item) => (
                            <ProductCard key={item.id} product={item} />
                        ))}
                    </div>
                </section>
            )}
        </main>

    )
}