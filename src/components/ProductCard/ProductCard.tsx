import styles from '@/components/ProductCard/ProductCard.module.css'
import Link from 'next/link'

export default function ProductCard({ product }: any) {
    return (
        <Link className={styles.link} href={`/products/${product.id}`}>
            <div className={styles.card}>
  
                    <img className = {styles.image} src={product.image_url} alt={product.name} />
      

                <div className={styles.content}>
                    <h2 className={styles.name}>{product.name}</h2>
                    <p className={styles.price}>₹{product.price}</p>
                </div>

            </div>
        </Link>

    )
}