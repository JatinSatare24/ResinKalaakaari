import type { Metadata } from "next";
import AdminShell from "@/components/Admin/AdminShell/AdminShell";
import AdminDashboard from "@/components/Admin/Dashboard/Dashboard";
import { requireAdmin } from "@/lib/auth";
import { getAdminCounts } from "@/lib/data/admin-dashboard";

export const metadata: Metadata = {
  title: "Admin | Resin Kalaakaari",
  robots: { index: false },
};

// The page the Navbar "Admin" link opens. Signed in -> admin -> then (and
// only then) load the counts. A non-admin gets the 404 page.
export default async function AdminPage() {
  await requireAdmin("/admin");
  const counts = await getAdminCounts();

  return (
    <AdminShell>
      <AdminDashboard counts={counts} />
    </AdminShell>
  );
}
