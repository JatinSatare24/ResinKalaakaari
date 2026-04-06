import styles from '@/components/ProductCard/ProductCard.module.css'
import Link from 'next/link'

export default function ProductCard({ product }: any) {
    return (
        <Link href={`/products/${product.id}`}>
            <div className={styles.card}>
                <img src={product.image} alt={product.name} className={styles.image} />

                <div className={styles.content}>
                    <h2 className={styles.name}>{product.name}</h2>
                    <p className={styles.price}>₹{product.price}</p>
                </div>

            </div>
        </Link>

    )
}