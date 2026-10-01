// --- IMPORTS ---
import Image from "next/image";
import { formatStatus, orderSubtotal, shortOrderId } from "@/lib/orders";
import type { OrderDetail } from "@/lib/types";
import styles from "@/components/MyOrderDetail/MyOrderDetail.module.css";

// --- INTERFACES ---
export interface MyOrderDetailProps {
  order: OrderDetail;
}

// --- COMPONENT ---
// Server Component: pure display, no state, so no "use client".
export default function MyOrderDetail({ order }: MyOrderDetailProps) {
  // Shipping = total - items, so no page hardcodes the shipping fee.
  const subtotal = orderSubtotal(order.lines);
  const shipping = order.total_price - subtotal;

  return (
    // The layout already provides <main>, so this is a section.
    <section className={styles.container} aria-labelledby="order-title">
      <header className={styles.header}>
        <h1 id="order-title">Order #{shortOrderId(order.id)}</h1>
        <span
          className={styles.statusBadge}
          data-status={order.status}
          aria-label={`Order status: ${formatStatus(order.status)}`}
        >
          {formatStatus(order.status)}
        </span>
      </header>

      <div className={styles.grid}>
        <section
          className={styles.itemsSection}
          aria-labelledby="items-heading"
        >
          <h3 id="items-heading">Items in your order</h3>

          {order.lines.map((line) => (
            <article key={line.id} className={styles.itemCard}>
              {line.product ? (
                <Image
                  src={line.product.image_url}
                  alt={`Product image for ${line.product.name}`}
                  width={90}
                  height={90}
                />
              ) : null}
              <div className={styles.itemInfo}>
                {/* product is null if it was deleted after the order */}
                <h4>{line.product?.name ?? "Product no longer available"}</h4>
                <p>Qty: {line.quantity}</p>
                <p className={styles.price}>₹{line.price_at_purchase}</p>
              </div>
            </article>
          ))}
        </section>

        <aside
          className={styles.summarySection}
          aria-label="Order Summary and Shipping Details"
        >
          <div className={styles.card}>
            <h3>Shipping Address</h3>
            <address style={{ fontStyle: "normal" }}>
              <p>{order.full_name}</p>
              <p>{order.shipping_address}</p>
              <p>
                {order.city}, {order.state} - {order.pincode}
              </p>
              <p>Phone: {order.phone}</p>
            </address>
          </div>

          <div className={styles.card}>
            <h3>Order Summary</h3>
            <div className={styles.row}>
              <span>Subtotal</span>
              <span>₹{subtotal}</span>
            </div>
            <div className={styles.row}>
              <span>Shipping</span>
              <span>₹{shipping}</span>
            </div>
            <div className={`${styles.row} ${styles.total}`}>
              <span>Total</span>
              <span>₹{order.total_price}</span>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
