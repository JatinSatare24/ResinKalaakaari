import styles from '@/components/ProductDetails/ProductDetail.module.css';
import Breadcrumb from '../BreadCrumbNavigation/BreadCrumbNavigation';

export default function ProductDetail({ product, addToCart }) {
    return (
        <div className={styles.container}>
            {/* Breadcrumb */}
            <Breadcrumb
                categoryName={product.categories.name}
                categorySlug={product.categories.slug}
                productName={product.name}
            />

            {/* Product Layout */}
            <div className={styles.productLayout}>
                {/* Product Image */}
                <div className={styles.imageWrapper}>
                    <img
                        src={product.image_url}
                        alt={product.name}
                    />
                </div>

                {/* Product Content */}
                <div className={styles.content}>
                    <h1 className={styles.name}>{product.name}</h1>
                    <p className={styles.price}>₹{product.price}</p>
                    <p className={styles.description}>
                        {product.description}
                    </p>

                    <button
                        className={styles.button}
                        onClick={() => addToCart(product)}
                    >
                        Add to Cart
                    </button>
                </div>
            </div>
        </div>
    );
}