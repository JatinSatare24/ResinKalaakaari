/**
 * CART CARD COMPONENT
 * Displays an individual product inside the shopping cart.
 * Note: CSS module acts as the styling hub for the entire Cart Page route.
 */

// --- IMPORTS ---
import Image from "next/image";
import { useCart } from "@/context/CartContext";
import { MAX_CART_QUANTITY } from "@/lib/constants";
import type { CartItem } from "@/lib/types";
import styles from "@/components/CartCard/CartCard.module.css";

// --- INTERFACES ---
export interface CartCardProps {
  item: CartItem;
}

// --- COMPONENT ---
export default function CartCard({ item }: CartCardProps) {
  // --- CONTEXT ---
  const { removeFromCart, updateQuantity } = useCart();

  // --- RENDER ---
  return (
    <article className={styles.card} aria-labelledby={`item-name-${item.id}`}>
      {/* --- PRODUCT IMAGE --- */}
      <div className={styles.imageContainer}>
        {/* width/height only reserve the aspect ratio; CartCard.module.css
            sets the real size per breakpoint (95 / 150 / 200 / 300px), and
            `sizes` mirrors that so the browser downloads a small file. */}
        <Image
          src={item.image_url}
          alt={`Thumbnail for ${item.name}`}
          width={300}
          height={300}
          sizes="(min-width: 1280px) 300px, (min-width: 1024px) 200px, (min-width: 768px) 150px, 95px"
          className={styles.image}
        />
      </div>

      {/* --- PRODUCT DETAILS & CONTROLS --- */}
      <section className={styles.content}>
        <h2 id={`item-name-${item.id}`} className={styles.name}>
          {item.name}
        </h2>
        <p className={styles.price} aria-label={`Unit price: ₹${item.price}`}>
          ₹{item.price}
        </p>

        {/* Quantity Controls */}
        <div
          className={styles.controls}
          role="group"
          aria-label="Adjust quantity"
        >
          <button
            type="button"
            onClick={() => updateQuantity(item.id, -1)}
            className={styles.controlButton}
            aria-label={`Decrease quantity of ${item.name}`}
          >
            -
          </button>

          {/* aria-live ensures screen readers announce the number update immediately */}
          <span
            aria-live="polite"
            aria-atomic="true"
            className={styles.quantityDisplay}
          >
            {item.quantity}
          </span>

          <button
            type="button"
            onClick={() => updateQuantity(item.id, +1)}
            className={styles.controlButton}
            aria-label={`Increase quantity of ${item.name}`}
            disabled={item.quantity >= MAX_CART_QUANTITY}
          >
            +
          </button>
        </div>

        <p
          className={styles.total}
          aria-label={`Subtotal for this item: ₹${item.price * item.quantity}`}
        >
          Total: ₹{item.price * item.quantity}
        </p>
      </section>

      {/* --- REMOVE ACTION --- */}
      <button
        type="button"
        className={styles.remove}
        onClick={() => removeFromCart(item.id)}
        aria-label={`Remove ${item.name} from cart`}
      >
        ✕
      </button>
    </article>
  );
}
