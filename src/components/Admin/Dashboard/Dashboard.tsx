// --- IMPORTS ---
import Link from "next/link";
import type { AdminCounts } from "@/lib/data/admin-dashboard";
import styles from "@/components/Admin/Dashboard/Dashboard.module.css";

// --- INTERFACES ---
export interface AdminDashboardProps {
  counts: AdminCounts;
}

// --- HELPERS ---
function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

// --- COMPONENT ---
// The page the Navbar "Admin" link opens: one big card per area. Server
// Component, no client state. The role check lives in the page, not here.
export default function AdminDashboard({ counts }: AdminDashboardProps) {
  return (
    <section className={styles.wrapper} aria-labelledby="admin-home-title">
      <h1 id="admin-home-title" className={styles.title}>
        Admin
      </h1>
      <p className={styles.intro}>What would you like to manage?</p>

      <ul className={styles.cards}>
        <li>
          <Link href="/admin/orders" className={styles.card}>
            <span className={styles.cardTitle}>Orders</span>
            <span className={styles.count}>
              {plural(counts.orders, "order", "orders")}
            </span>
            {counts.ordersToCheck > 0 && (
              <span className={styles.alert}>
                {plural(counts.ordersToCheck, "payment", "payments")} to check
              </span>
            )}
            <span className={styles.hint}>
              See orders and update their status
            </span>
          </Link>
        </li>

        <li>
          <Link href="/admin/products" className={styles.card}>
            <span className={styles.cardTitle}>Products</span>
            <span className={styles.count}>
              {plural(counts.products, "product", "products")}
            </span>
            <span className={styles.hint}>
              Add a product or change a price, photo or description
            </span>
          </Link>
        </li>

        <li>
          <Link href="/admin/categories" className={styles.card}>
            <span className={styles.cardTitle}>Categories</span>
            <span className={styles.count}>
              {plural(counts.categories, "category", "categories")}
            </span>
            <span className={styles.hint}>Add or rename a category</span>
          </Link>
        </li>
      </ul>
    </section>
  );
}
