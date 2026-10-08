import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AdminShell from "@/components/Admin/AdminShell/AdminShell";
import ProductFormPage from "@/components/Admin/ProductForm/ProductFormPage";
import { requireAdmin } from "@/lib/auth";
import { getAdminCategories } from "@/lib/data/admin-categories";
import { getAdminProduct } from "@/lib/data/admin-products";
import type { RawSearchParams } from "@/lib/search-params";

export const metadata: Metadata = {
  title: "Admin: Edit product | Resin Kalaakaari",
  robots: { index: false },
};

// Signed in -> admin -> data. An id that is not a product gives the normal
// 404. The returnTo is a fixed path (not the id from the URL) so a strange
// id can never end up in the login redirect.
export default async function AdminEditProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<RawSearchParams>;
}) {
  await requireAdmin("/admin/products");

  const { id } = await params;
  const [product, categories, query] = await Promise.all([
    getAdminProduct(id),
    getAdminCategories(),
    searchParams,
  ]);
  if (!product) notFound();

  return (
    <AdminShell>
      <ProductFormPage
        mode="edit"
        productId={product.id}
        initial={{
          name: product.name,
          description: product.description,
          price: String(product.price),
          photos: product.photos,
          category_id: product.category_id,
          is_featured: product.is_featured,
          is_gallery: product.is_gallery,
        }}
        categories={categories.map(({ id, name }) => ({ id, name }))}
        justAdded={query.added === "1"}
      />
    </AdminShell>
  );
}
