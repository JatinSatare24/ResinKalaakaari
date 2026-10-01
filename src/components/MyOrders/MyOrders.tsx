// --- IMPORTS ---
import Link from "next/link";
import { formatStatus, shortOrderId } from "@/lib/orders";
import type { OrderSummary } from "@/lib/types";
import styles from "@/components/MyOrders/MyOrders.module.css";

// --- INTERFACES ---
export interface MyOrdersProps {
  orders: OrderSummary[];
}

// A <Link> that looks like the old buttons: the card styles give the border
// and padding, this only removes the link's own underline and colour.
const linkAsButton = {
  display: "block",
  textDecoration: "none",
  color: "inherit",
} as const;

// --- COMPONENT ---
// No "use client": it only shows data, so it stays a Server Component and
// ships no JavaScript. Navigation uses real links (keyboard, middle-click,
// crawlable) instead of router.push on a button.
export default function MyOrders({ orders }: MyOrdersProps) {
  if (orders.length === 0) {
    return (
      <div className={styles.emptyState}>
        <h2>No orders yet!</h2>
        <p>Your artistic sanctuary is waiting for its first piece.</p>
        <Link
          href="/products"
          className={styles.detailsBtn}
          style={{ ...linkAsButton, margin: "16px auto 0", maxWidth: "220px" }}
        >
          Start Shopping
        </Link>
      </div>
    );
  }

  return (
    // The layout already provides <main>, so this is a section.
    <section className={styles.container} aria-labelledby="my-orders-title">
      <h1 id="my-orders-title" className={styles.title}>
        My Orders
      </h1>

      <ul
        className={styles.orderList}
        style={{ listStyle: "none", padding: 0 }}
      >
        {orders.map((order) => (
          <li key={order.id}>
            <article className={styles.orderCard}>
              <header className={styles.cardHeader}>
                <div>
                  <span className={styles.label}>ORDER PLACED</span>
                  <p>
                    {new Date(order.created_at).toLocaleDateString("en-IN")}
                  </p>
                </div>
                <div>
                  <span className={styles.label}>TOTAL</span>
                  <p>₹{order.total_price}</p>
                </div>
                <div
                  className={styles.statusBadge}
                  data-status={order.status}
                  aria-label={`Order status: ${formatStatus(order.status)}`}
                >
                  {formatStatus(order.status)}
                </div>
              </header>

              <div className={styles.cardBody}>
                <p>Order ID: #{shortOrderId(order.id)}</p>
                <p>
                  {order.item_count} {order.item_count === 1 ? "item" : "items"}{" "}
                  in this order
                </p>
                <Link
                  href={`/my-orders/${order.id}`}
                  className={styles.detailsBtn}
                  style={linkAsButton}
                  aria-label={`View details for order ${shortOrderId(order.id)}`}
                >
                  View Details
                </Link>
              </div>
            </article>
          </li>
        ))}
      </ul>
    </section>
  );
}
