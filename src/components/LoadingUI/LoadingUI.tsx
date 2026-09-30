// --- IMPORTS ---
import productStyles from "@/components/ProductCard/ProductCard.module.css";
import styles from "@/components/LoadingUI/LoadingUI.module.css";

// --- INTERFACES ---
export interface LoadingUIProps {
  label: string; // read out by screen readers, e.g. "Loading products"
  // Which shape to sketch with grey boxes:
  // grid = a whole products page, detail = a product page,
  // section = one row-sized block of the home page.
  variant: "grid" | "detail" | "section";
}

const WRAPPER_CLASS = {
  grid: productStyles.productContainer,
  detail: styles.detail,
  section: styles.section,
} as const;

// --- COMPONENT ---
// Reusable, prop-driven skeleton, same idea as NotFoundUI and ErrorUI.
// A loading.tsx file (or a <Suspense fallback>) just picks a variant and a label.
export default function LoadingUI({ label, variant }: LoadingUIProps) {
  return (
    <div className={WRAPPER_CLASS[variant]} aria-busy="true">
      <span className={styles.srOnly} role="status">
        {label}
      </span>

      {variant === "grid" && (
        // Six grey cards in the same grid the real products use.
        <div className={productStyles.productGrid}>
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className={styles.card} />
          ))}
        </div>
      )}

      {variant === "detail" && (
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

      {variant === "section" && (
        // A heading bar and a row of grey tiles: the shape of a home page section.
        <>
          <div className={styles.sectionHeading} />
          <div className={styles.sectionGrid}>
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className={styles.sectionCard} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
