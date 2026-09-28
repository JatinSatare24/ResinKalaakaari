// --- IMPORTS ---
import productStyles from "@/components/ProductCard/ProductCard.module.css";
import styles from "@/components/LoadingUI/LoadingUI.module.css";

// --- INTERFACES ---
export interface LoadingUIProps {
  label: string; // read out by screen readers, e.g. "Loading products"
  variant: "grid" | "detail"; // which page shape to sketch with grey boxes
}

// --- COMPONENT ---
// Reusable, prop-driven skeleton, same idea as NotFoundUI and ErrorUI.
// A loading.tsx file just picks a variant and a label.
export default function LoadingUI({ label, variant }: LoadingUIProps) {
  return (
    <div
      className={
        variant === "grid" ? productStyles.productContainer : styles.detail
      }
      aria-busy="true"
    >
      <span className={styles.srOnly} role="status">
        {label}
      </span>

      {variant === "grid" ? (
        // Six grey cards in the same grid the real products use.
        <div className={productStyles.productGrid}>
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className={styles.card} />
          ))}
        </div>
      ) : (
        // Grey image on the left, grey text lines + button on the right.
        <>
          <div className={styles.image} />
          <div className={styles.text}>
            <div className={styles.title} />
            <div className={styles.line} />
            <div className={styles.line} />
            <div className={styles.button} />
          </div>
        </>
      )}
    </div>
  );
}
