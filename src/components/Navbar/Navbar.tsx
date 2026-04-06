import Link from 'next/link'
import styles from '@/components/Navbar/Navbar.module.css'

export default function Navbar() {
    return (
        <nav className={styles.nav}>
            <Link href='/'>
                <h2>Resin Kalaakari</h2>
            </Link>
            <div className={styles.links}>
                <Link href='/products'>Products</Link>
                <Link href='/cart'>Cart</Link>
            </div>

        </nav>
    )
}