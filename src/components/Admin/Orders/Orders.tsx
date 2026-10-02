// --- IMPORTS ---
import OrderStatusSelect from "@/components/Admin/Orders/OrderStatusSelect";
import PaginationControls from "@/components/PaginationControls/PaginationControls";
import { formatStatus, shortOrderId } from "@/lib/orders";
import { buildAdminOrdersHref } from "@/lib/search-params";
import type { AdminOrder } from "@/lib/types";
import styles from "@/components/Admin/Orders/Orders.module.css";

// --- INTERFACES ---
export interface AdminOrdersProps {
  orders: AdminOrder[];
  page: number;
  totalPages: number;
  totalCount: number;
}

// --- COMPONENT ---
// No "use client": the table is plain HTML from the server. The only
// interactive piece is OrderStatusSelect. The role check lives in the page
// (requireAdmin), not here, so this component can never be shown by mistake.
export default function AdminOrders({
  orders,
  page,
  totalPages,
  totalCount,
}: AdminOrdersProps) {
  return (
    // The layout already provides <main>, so this is a section.
    <section className={styles.adminWrapper} aria-labelledby="admin-title">
      <h1 id="admin-title" className={styles.adminTitle}>
        Admin: Manage Orders
      </h1>
      <p className={styles.summary}>
        {totalCount} {totalCount === 1 ? "order" : "orders"}
      </p>

      {orders.length === 0 ? (
        <p className={styles.empty}>No orders yet.</p>
      ) : (
        <div className={styles.tableResponsive}>
          <table className={styles.orderTable}>
            <caption className="sr-only">
              List of customer orders and payment statuses
            </caption>

            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Order ID</th>
                <th scope="col">Transaction ID</th>
                <th scope="col">Customer</th>
                <th scope="col">Total</th>
                <th scope="col">Status</th>
                <th scope="col">Action</th>
              </tr>
            </thead>

            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td data-label="Date">
                    {new Date(order.created_at).toLocaleDateString("en-IN")}
                  </td>

                  <td data-label="Order ID" className={styles.orderId}>
                    RK-{shortOrderId(order.id)}
                  </td>

                  <td data-label="Transaction ID" className={styles.orderId}>
                    {order.transaction_id
                      ? order.transaction_id.toUpperCase()
                      : "N/A"}
                  </td>

                  <td data-label="Customer">{order.full_name}</td>

                  <td data-label="Total">₹{order.total_price}</td>

                  <td data-label="Status">
                    {/* data-status (not a class per status) so every status,
                        including "in-process", gets its colour from CSS. */}
                    <span
                      className={styles.badge}
                      data-status={order.status}
                      aria-label={`Current status: ${formatStatus(order.status)}`}
                    >
                      {formatStatus(order.status)}
                    </span>
                  </td>

                  <td data-label="Action">
                    <OrderStatusSelect
                      orderId={order.id}
                      status={order.status}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <PaginationControls
          page={page}
          totalPages={totalPages}
          buildHref={buildAdminOrdersHref}
        />
      )}
    </section>
  );
}
