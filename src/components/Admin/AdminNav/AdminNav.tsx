"use client";

// --- IMPORTS ---
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "@/components/Admin/AdminNav/AdminNav.module.css";

// --- DATA ---
type Tab = { href: string; label: string; exact?: boolean };

const TABS: Tab[] = [
  { href: "/admin", label: "Dashboard", exact: true },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/categories", label: "Categories" },
];

// --- COMPONENT ---
// The tab strip on every admin page. A Client Component only because it asks
// the browser which page is open (usePathname) to mark the current tab. It is
// just links: the pages and the database still do every permission check.
export default function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className={styles.nav} aria-label="Admin">
      <ul className={styles.list}>
        {TABS.map((tab) => {
          const active = tab.exact
            ? pathname === tab.href
            : pathname.startsWith(tab.href);
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                className={`${styles.tab} ${active ? styles.active : ""}`}
                aria-current={active ? "page" : undefined}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
