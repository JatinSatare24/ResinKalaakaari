import styles from '@/components/CategoryFilter/CategoryFilter.module.css'
import Link from 'next/link'

export default function CategoriesFilter({ categories }) {
    return (
        <div className={styles.container}>
            <Link href={'/products'} className={styles.link}><p className={styles.name}>All</p></Link>
            {
                categories.map(category => (

                    <Link href={`/products?category=${category.slug}`} key={category.id} className={styles.link}><p className={styles.name}>{category.name}</p></Link>
                )
                )
            }
        </div>
    )
}