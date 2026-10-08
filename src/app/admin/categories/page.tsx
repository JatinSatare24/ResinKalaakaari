import type { Metadata } from "next";
import AdminShell from "@/components/Admin/AdminShell/AdminShell";
import AdminCategoriesList from "@/components/Admin/Categories/CategoriesList";
import { requireAdmin } from "@/lib/auth";
import { getAdminCategories } from "@/lib/data/admin-categories";

export const metadata: Metadata = {
  title: "Admin: Categories | Resin Kalaakaari",
  robots: { index: false },
};

// Same order of checks as the other admin pages: signed in -> admin -> data.
export default async function AdminCategoriesPage() {
  await requireAdmin("/admin/categories");
  const categories = await getAdminCategories();

  return (
    <AdminShell>
      <AdminCategoriesList categories={categories} />
    </AdminShell>
  );
}
