"use client";

// --- IMPORTS ---
import Link from "next/link";
import { useRouter } from "next/navigation";
import CartCard from "@/components/CartCard/CartCard";
import Loader from "@/components/Spinner/Spinner";
import { useCart } from "@/context/CartContext";
import { cartTotal } from "@/lib/cart";
// The cart page's main styles live in the CartCard module (its own header
// says so). CartView.module.css only adds what is new.
import cardStyles from "@/components/CartCard/CartCard.module.css";
import styles from "@/components/CartView/CartView.module.css";

// --- COMPONENT ---
// The whole cart page. It has to be a client component because the cart
// lives in the browser (localStorage for guests).
export default function CartView() {
  const {
    cart,
    user,
    cartReady,
    cartLoadFailed,
    syncError,
    clearCart,
    retryCartLoad,
  } = useCart();
  const router = useRouter();

  // Signed in, but the saved cart could not be loaded.
  if (cartLoadFailed) {
    return (
      <div className={cardStyles.empty} role="alert">
        <h1 className={cardStyles.title}>We couldn’t load your saved cart</h1>
        <p className={cardStyles.subtitle}>
          Check your connection and try again.
        </p>
        <button
          type="button"
          className={cardStyles.button}
          onClick={retryCartLoad}
        >
          Try again
        </button>
      </div>
    );
  }

  // Wait until the cart can be trusted. Without this, a signed-in user would
  // see "Your cart is empty" for a moment on every reload.
  if (!cartReady) return <Loader message="Loading your cart" />;

  if (cart.length === 0) {
    return (
      <div className={cardStyles.empty}>
        <h1 className={cardStyles.title}>Your cart is empty</h1>
        <p className={cardStyles.subtitle}>
          Looks like you haven’t added anything yet
        </p>

        {/* A link that looks like a button. A <button> inside a <Link> is
            invalid HTML and makes two tab stops. */}
        <Link href="/" className={cardStyles.button}>
          Shop now
        </Link>
      </div>
    );
  }

  return (
    <section>
      <h1 className={styles.srOnly}>Your cart</h1>

      {syncError && (
        <p role="alert" className={styles.syncError}>
          {syncError}
        </p>
      )}

      <div className={cardStyles.cartContainer}>
        {cart.map((item) => (
          <CartCard key={item.id} item={item} />
        ))}
      </div>

      <div className={cardStyles.summary}>
        <div className={cardStyles.totalRow}>
          <span>Grand Total</span>
          <span>₹{cartTotal(cart)}</span>
        </div>

        {/* /checkout is protected by proxy.ts too. The check here just skips
            a redirect round-trip for a guest. */}
        <button
          type="button"
          onClick={() => router.push(user ? "/checkout" : "/login")}
          className={cardStyles.checkoutBtn}
        >
          Proceed to Checkout
        </button>

        <button
          type="button"
          className={cardStyles.clearBtn}
          onClick={() => clearCart()}
        >
          Clear Cart
        </button>
      </div>
    </section>
  );
}
