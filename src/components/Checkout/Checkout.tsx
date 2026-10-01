"use client";

// --- IMPORTS ---
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { placeOrder } from "@/app/checkout/actions";
import ErrorUI from "@/components/ErrorUI/ErrorUI";
import FormError from "@/components/FormError/FormError";
import Loader from "@/components/Spinner/Spinner";
import { useCart } from "@/context/CartContext";
import { cartCount, cartTotal } from "@/lib/cart";
import {
  hasErrors,
  parseShipping,
  validateShipping,
  type ShippingErrors,
} from "@/lib/checkout";
import { SHIPPING_FEE } from "@/lib/constants";
import type { ShippingDetails } from "@/lib/types";
import styles from "@/components/Checkout/Checkout.module.css";

// --- INTERFACES ---
export interface CheckoutProps {
  initialShipping: ShippingDetails; // saved profile address, loaded on the server
}

// --- COMPONENT ---
// The browser only collects the address and shows an ESTIMATE of the total.
// The real order is created and priced on the server (placeOrder action).
export default function Checkout({ initialShipping }: CheckoutProps) {
  const {
    cart,
    cartReady,
    cartLoadFailed,
    clearCart,
    flushCart,
    retryCartLoad,
  } = useCart();
  const router = useRouter();

  const [form, setForm] = useState<ShippingDetails>(initialShipping);
  const [fieldErrors, setFieldErrors] = useState<ShippingErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // A ref (not state): set the moment the order exists, BEFORE the cart is
  // cleared, so the effect below can never mistake "cart emptied by us" for
  // "empty cart, go back".
  const orderPlaced = useRef(false);

  // An empty cart has nothing to check out. Wait for cartReady first: until
  // the saved cart has loaded, cart is [] even for a full cart.
  useEffect(() => {
    if (cartReady && cart.length === 0 && !orderPlaced.current) {
      router.replace("/cart");
    }
  }, [cartReady, cart.length, router]);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting) return;

    // Instant feedback. The server checks again (never trust the browser).
    const errors = validateShipping(parseShipping(form)); // trims first
    setFieldErrors(errors);
    if (hasErrors(errors)) {
      setFormError("Please fix the highlighted fields.");
      return;
    }

    setFormError(null);
    setIsSubmitting(true);
    try {
      // The server builds the order from the SAVED cart, so let any queued
      // cart writes reach the database first.
      await flushCart();

      const result = await placeOrder(form);
      if (!result.ok) {
        setFormError(result.message);
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }

      // The database cart was emptied by the order itself. This clears the
      // local copy (and repeats the harmless database delete).
      orderPlaced.current = true;
      await clearCart();
      router.push(`/checkout/success?id=${result.orderId}`);
    } catch (error) {
      console.error("Order failed:", error);
      setFormError(
        "Something went wrong while placing your order. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Props shared by every field: value, handler, error wiring.
  const fieldProps = (name: keyof ShippingDetails) => ({
    name,
    value: form[name],
    onChange: handleChange,
    className: styles.inputField,
    required: true,
    "aria-invalid": fieldErrors[name] ? true : undefined,
    "aria-describedby": fieldErrors[name] ? `${name}-error` : undefined,
    style: fieldErrors[name] ? { borderColor: "#dc2626" } : undefined,
  });
  const errorFor = (name: keyof ShippingDetails) =>
    fieldErrors[name] ? (
      <FormError id={`${name}-error`}>{fieldErrors[name]}</FormError>
    ) : null;

  // --- RENDER GUARDS ---
  if (cartLoadFailed) {
    return (
      <ErrorUI
        title="We couldn't load your cart"
        message="Check your connection and try again."
        onRetry={retryCartLoad}
      />
    );
  }
  if (!cartReady) return <Loader message="Loading checkout" />;
  // Empty cart: the effect above is sending the customer to /cart, or the
  // order just went through and we are heading to the success page.
  if (cart.length === 0) return <Loader message="One moment" />;

  // Estimate only. The server prices the order again from the products table.
  const subtotal = cartTotal(cart);
  const grandTotal = subtotal + SHIPPING_FEE;

  // --- MAIN RENDER ---
  return (
    <div className={styles.pageWrapper}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <h1 style={{ fontWeight: 700 }}>Checkout</h1>
          <Link href="/cart" style={{ fontSize: "14px", color: "#666" }}>
            Back to Cart
          </Link>
        </div>
      </header>

      {/* The layout already provides <main>, so this is a plain div. */}
      <div className={styles.mainContainer}>
        {/* noValidate: we show our own messages instead of browser bubbles. */}
        <form onSubmit={handleSubmit} noValidate>
          <div className={styles.checkoutGrid}>
            {/* LEFT COLUMN: FORM */}
            <section
              className={styles.formSection}
              aria-label="Shipping and Contact Details"
            >
              <div className={styles.sectionCard}>
                <h2 className={styles.sectionTitle}>Contact Information</h2>
                <div className={styles.inputGroup}>
                  <input
                    {...fieldProps("full_name")}
                    type="text"
                    aria-label="Full Name"
                    placeholder="Full Name"
                    autoComplete="name"
                  />
                  {errorFor("full_name")}
                  <input
                    {...fieldProps("phone")}
                    type="tel"
                    aria-label="Phone Number"
                    placeholder="Phone Number"
                    autoComplete="tel"
                  />
                  {errorFor("phone")}
                </div>
              </div>

              <div className={styles.sectionCard}>
                <h2 className={styles.sectionTitle}>Shipping Address</h2>
                <div className={styles.inputGroup}>
                  <textarea
                    {...fieldProps("address_line")}
                    aria-label="Street Address"
                    placeholder="Full Address (House No, Building, Street)"
                    rows={3}
                    autoComplete="street-address"
                  />
                  {errorFor("address_line")}
                  <div className={styles.rowInputs}>
                    <input
                      {...fieldProps("city")}
                      type="text"
                      aria-label="City"
                      placeholder="City"
                      autoComplete="address-level2"
                    />
                    <input
                      {...fieldProps("state")}
                      type="text"
                      aria-label="State"
                      placeholder="State"
                      autoComplete="address-level1"
                    />
                    <input
                      {...fieldProps("pincode")}
                      type="text"
                      inputMode="numeric"
                      aria-label="Pincode"
                      placeholder="Pincode"
                      autoComplete="postal-code"
                    />
                  </div>
                  {/* The three inputs share one grid row, so their messages
                      go underneath it. */}
                  {errorFor("city")}
                  {errorFor("state")}
                  {errorFor("pincode")}
                </div>
              </div>
            </section>

            {/* RIGHT COLUMN: SUMMARY */}
            <aside className={styles.summarySection} aria-label="Order Summary">
              <div className={`${styles.sectionCard} ${styles.stickySummary}`}>
                <h2 className={styles.sectionTitle}>Order Summary</h2>

                <div className={styles.summaryRow}>
                  <span>Subtotal ({cartCount(cart)} items)</span>
                  <span>₹{subtotal}</span>
                </div>
                <div className={styles.summaryRow}>
                  <span>Shipping</span>
                  <span>₹{SHIPPING_FEE}</span>
                </div>

                <div
                  className={styles.grandTotalRow}
                  aria-label={`Grand Total: ₹${grandTotal}`}
                >
                  <span>Grand Total</span>
                  <span>₹{grandTotal}</span>
                </div>

                {formError && <FormError>{formError}</FormError>}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={styles.placeOrderBtn}
                  aria-busy={isSubmitting}
                >
                  {isSubmitting ? "Placing order..." : "Place Order"}
                </button>

                <p
                  style={{ fontSize: "12px", color: "#666", marginTop: "12px" }}
                >
                  Prices are confirmed again when you place the order.
                </p>
              </div>
            </aside>
          </div>
        </form>
      </div>
    </div>
  );
}
