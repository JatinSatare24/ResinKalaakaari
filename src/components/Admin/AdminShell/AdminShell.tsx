// --- IMPORTS ---
import type { ReactNode } from "react";
import AdminNav from "@/components/Admin/AdminNav/AdminNav";
import styles from "@/components/Admin/AdminShell/AdminShell.module.css";

// --- INTERFACES ---
export interface AdminShellProps {
  children: ReactNode;
}

// --- COMPONENT ---
// The frame around every admin page: the tab strip, then the page content.
// Each page renders this only AFTER its own requireAdmin() has passed, so a
// non-admin gets the normal 404 with no admin tabs around it. (A layout.tsx
// would not do: it would draw the tabs around that 404, and the Next docs
// warn that layouts do not re-run on navigation, so they are the wrong place
// for a permission check.)
export default function AdminShell({ children }: AdminShellProps) {
  return (
    <div className={styles.shell}>
      <AdminNav />
      {children}
    </div>
  );
}
