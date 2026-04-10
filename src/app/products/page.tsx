import ProductCard from '@/components/ProductCard/ProductCard'
// import { products } from '@/data/products'
import styles from '@/components/ProductCard/ProductCard.module.css'
import { supabase } from '@/lib/supabase'

export default async function ProductsPage() {

    const { data, error } = await supabase
        .from('products')
        .select('*')

    if (error) {
        console.error('Error fetching products: ', error.message)
        return <p>Failed to load products!</p>
    }

    const products = data ?? []

    return (
        <main>
            <h1>Products</h1>
            <div className={styles.productGrid}>
                {products?.map(product => (
                    <ProductCard key={product.id} product={product} />
                ))}
            </div>
        </main>
    );
}