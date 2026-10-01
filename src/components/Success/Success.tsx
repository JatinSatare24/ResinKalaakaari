"use client";

// --- IMPORTS ---
import { useState, type FormEvent } from "react";
import Link from "next/link";
import Confetti from "react-confetti";
import { useWindowSize } from "react-use";
import { FiSmartphone, FiCopy, FiCheckCircle } from "react-icons/fi";
import { submitPayment } from "@/app/checkout/actions";
import FormError from "@/components/FormError/FormError";
import { UPI_ID, UTR_LENGTH, WHATSAPP_NUMBER } from "@/lib/constants";
import { shortOrderId } from "@/lib/orders";
import type { PayableOrder } from "@/lib/types";
import styles from "@/components/Success/Success.module.css";

// --- INTERFACES ---
export interface SuccessProps {
  order: PayableOrder; // loaded and ownership-checked on the server
}

// --- COMPONENT ---
// Everything here is interaction (copy, type a UTR, confetti), so it is a
// client component. The data comes in as a prop from the server page.
export default function Success({ order }: SuccessProps) {
  const { width, height } = useWindowSize();

  const [utr, setUtr] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // A UTR already saved earlier means the payment step is done.
  const [paymentSubmitted, setPaymentSubmitted] = useState(
    Boolean(order.transaction_id),
  );
  const [showConfetti, setShowConfetti] = useState(false);

  const handleConfirmPayment = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (utr.length !== UTR_LENGTH) {
      setError(`Enter the ${UTR_LENGTH}-character UTR / transaction ID.`);
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      // The server action only sets the UTR and status on YOUR pending
      // order. The old browser UPDATE could change any column.
      const result = await submitPayment(order.id, utr);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setPaymentSubmitted(true);
      setShowConfetti(true);
    } catch (err) {
      console.error("Payment confirmation error:", err);
      setError("We couldn't submit your details. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleWhatsAppRedirect = () => {
    const message = encodeURIComponent(
      `Hi Sanika! I just placed order #${order.id}. I've paid ₹${order.total_price} via UPI. Here is my screenshot!`,
    );
    window.open(
      `https://wa.me/${WHATSAPP_NUMBER}?text=${message}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  const handleCopyUPI = async () => {
    try {
      await navigator.clipboard.writeText(UPI_ID);
    } catch (err) {
      // Clipboard can be blocked (permissions, insecure page): not fatal.
      console.error("Copy failed:", err);
    }
  };

  const upiLink = `upi://pay?pa=${UPI_ID}&pn=ResinKalaakaari&am=${order.total_price}&cu=INR&tn=Order_${order.id.slice(0, 8)}`;

  return (
    // A div, not <main>: the root layout already provides the <main>.
    <div className={styles.container}>
      {showConfetti && (
        <Confetti
          width={width}
          height={height}
          recycle={false} // one burst, then stop
          numberOfPieces={1000}
          gravity={0.1} // slower, more elegant fall
        />
      )}

      <div className={styles.card} aria-labelledby="success-title">
        {!paymentSubmitted ? (
          <>
            <div className={styles.icon} aria-hidden="true">
              🎨
            </div>
            <h1 id="success-title" className={styles.title}>
              Almost Done!
            </h1>
            <p className={styles.message}>
              Order <strong>#{shortOrderId(order.id)}</strong> is placed. To
              keep our art affordable, we accept direct UPI payments. Please
              complete your payment of <strong>₹{order.total_price}</strong>.
            </p>

            <section
              className={styles.paymentBox}
              aria-label="UPI Payment Options"
            >
              <a href={upiLink} className={styles.upiBtn}>
                <FiSmartphone aria-hidden="true" /> Pay via GPay / PhonePe /
                Paytm
              </a>

              <div className={styles.divider} aria-hidden="true">
                <span>OR SCAN / USE ID</span>
              </div>

              <div className={styles.upiIdRow}>
                <code aria-label="UPI ID">{UPI_ID}</code>
                <button
                  type="button"
                  onClick={handleCopyUPI}
                  title="Copy UPI ID"
                  aria-label="Copy UPI ID to clipboard"
                >
                  <FiCopy aria-hidden="true" />
                </button>
              </div>
            </section>

            <form
              className={styles.verificationSection}
              onSubmit={handleConfirmPayment}
              aria-labelledby="proof-heading"
              noValidate
            >
              <h3 id="proof-heading">Submit Payment Proof</h3>
              <input
                type="text"
                placeholder={`Enter ${UTR_LENGTH}-character UTR / Transaction ID`}
                value={utr}
                // Keep letters and digits only, in capitals: that is exactly
                // what the database accepts.
                onChange={(e) =>
                  setUtr(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))
                }
                className={styles.utrInput}
                maxLength={UTR_LENGTH}
                aria-label={`Enter ${UTR_LENGTH}-character UTR or Transaction ID`}
                aria-invalid={error ? true : undefined}
                autoComplete="off"
              />
              {error && <FormError>{error}</FormError>}
              <button
                type="submit"
                className={styles.confirmBtn}
                disabled={submitting}
                aria-busy={submitting}
              >
                {submitting ? "Submitting..." : "Confirm Payment"}
              </button>
            </form>
          </>
        ) : (
          <div role="alert" aria-live="assertive">
            <div
              className={styles.icon}
              style={{ color: "#10b981" }}
              aria-hidden="true"
            >
              <FiCheckCircle size={50} />
            </div>
            <h1 className={styles.title}>Payment Received!</h1>
            <p className={styles.message}>
              Thank you! Sanika will verify your transaction (ID:{" "}
              {utr || order.transaction_id}) and update your order status within
              24 hours.
            </p>
          </div>
        )}

        <div className={styles.actions}>
          <button
            type="button"
            onClick={handleWhatsAppRedirect}
            className={styles.whatsappBtn}
          >
            Share Screenshot on WhatsApp
          </button>
          <Link href="/my-orders" className={styles.homeBtn}>
            View My Orders
          </Link>
        </div>
      </div>
    </div>
  );
}
