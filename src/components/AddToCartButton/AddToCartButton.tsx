"use client"; // needs onClick + the cart context, so it must run in the browser

// --- IMPORTS ---
import { useContext } from "react";
import { CartContext } from "@/context/CartContext";
import type { ProductSummary } from "@/lib/types";
import styles from "@/components/ProductDetails/ProductDetail.module.css";

// --- INTERFACES ---
export interface AddToCartButtonProps {
  product: ProductSummary;
}

// --- COMPONENT ---
// The product page is a Server Component, and a server component can't hold
// an onClick. So the one interactive piece lives here, as a small client
// component that the server page renders.
export default function AddToCartButton({ product }: AddToCartButtonProps) {
  const cart = useContext(CartContext);
  if (!cart) throw new Error("AddToCartButton must be inside <CartProvider>");

  return (
    <button
      type="button"
      className={styles.button}
      onClick={() =>
        // Only the fields the cart stores (id, name, price, image_url).
        cart.addToCart({
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
  );
}
