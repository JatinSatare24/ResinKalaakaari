import ProductCard from '@/components/ProductCard/ProductCard'
import { products } from '@/data/products'
import styles from '@/components/ProductCard/ProductCard.module.css'

export default function ProductsPage() {
    return (
        <main>
            <h1>Products</h1>
            <div className={styles.productGrid}>
                {products.map(product => (
                    <ProductCard key={product.id} product={product} />
                ))}
            </div>
        </main>
    );
}