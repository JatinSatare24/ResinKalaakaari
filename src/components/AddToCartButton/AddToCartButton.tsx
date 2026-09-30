"use client"; // needs onClick + the cart context, so it must run in the browser

// --- IMPORTS ---
import { useCart } from "@/context/CartContext";
import type { ProductSummary } from "@/lib/types";
import productStyles from "@/components/ProductDetails/ProductDetail.module.css";
import styles from "@/components/AddToCartButton/AddToCartButton.module.css";

// --- INTERFACES ---
export interface AddToCartButtonProps {
  product: ProductSummary;
}

// --- COMPONENT ---
// The product page is a Server Component, and a server component can't hold
// an onClick. So the one interactive piece lives here, as a small client
// component that the server page renders.
export default function AddToCartButton({ product }: AddToCartButtonProps) {
  const { cart, cartReady, syncError, addToCart } = useCart();

  // How many of this product are in the cart now. Screen readers hear it
  // change after each click (the live region below). No extra state needed.
  const inCart = cart.find((item) => item.id === product.id)?.quantity ?? 0;

  return (
    <>
      <button
        type="button"
        className={`${productStyles.button} ${styles.button}`}
        // The cart ignores changes until it has loaded, so don't offer the click.
        disabled={!cartReady}
        onClick={() =>
          // Only the fields the cart stores (id, name, price, image_url).
          addToCart({
            id: product.id,
            name: product.name,
            price: product.price,
            image_url: product.image_url,
          })
        }
        aria-label={`Add ${product.name} to your cart`}
      >
        Add to Cart
      </button>

      <span role="status" className={styles.srOnly}>
        {inCart > 0 ? `${inCart} in your cart` : ""}
      </span>

      {syncError && (
        <p role="alert" className={styles.error}>
          {syncError}
        </p>
      )}
    </>
  );
}
