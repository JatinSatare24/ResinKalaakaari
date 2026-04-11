import Link from "next/link";
import styles from '@/components/BreadCrumbNavigation/BreadCrumbNavigation.module.css'

interface BreadcrumbProps {
    categoryName?: string;
    categorySlug?: string;
    productName?: string;
}

export default function Breadcrumb({
    categoryName,
    categorySlug,
    productName,
}: BreadcrumbProps) {
    return (
        <nav aria-label="Breadcrumb" className={styles.breadcrumb}>
            <Link href="/">Home</Link> {' > '}
            <Link href="/products">Products</Link>

            {categoryName && categorySlug && (
                <>
                    {' > '}
                    <Link href={`/products?category=${categorySlug}`}>
                        {categoryName}
                    </Link>
                </>
            )}

            {productName && (
                <>
                    {' > '}
                    <span>{productName}</span>
                </>
            )}
        </nav>
    );
}