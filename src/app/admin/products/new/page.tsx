import type { Metadata } from "next";
import AdminShell from "@/components/Admin/AdminShell/AdminShell";
import ProductFormPage from "@/components/Admin/ProductForm/ProductFormPage";
import { requireAdmin } from "@/lib/auth";
import { getAdminCategories } from "@/lib/data/admin-categories";
import { EMPTY_PRODUCT_FORM } from "@/lib/product-admin";

export const metadata: Metadata = {
  title: "Admin: Add product | Resin Kalaakaari",
  robots: { index: false },
};

// Signed in -> admin -> data. Only the category list is needed here.
export default async function AdminNewProductPage() {
  await requireAdmin("/admin/products");
  const categories = await getAdminCategories();

  return (
    <AdminShell>
      <ProductFormPage
        mode="create"
        initial={EMPTY_PRODUCT_FORM}
        categories={categories.map(({ id, name }) => ({ id, name }))}
      />
    </AdminShell>
  );
}
