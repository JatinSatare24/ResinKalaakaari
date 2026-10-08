import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AdminShell from "@/components/Admin/AdminShell/AdminShell";
import AdminProductsList from "@/components/Admin/Products/ProductsList";
import { isAiAvailable, readAiConfig } from "@/lib/ai/config";
import { requireAdmin } from "@/lib/auth";
import { ADMIN_PRODUCTS_PER_PAGE } from "@/lib/constants";
import { getAdminProducts } from "@/lib/data/admin-products";
import {
  buildAdminProductsHref,
  parseAdminProductsQuery,
  type RawSearchParams,
} from "@/lib/search-params";

export const metadata: Metadata = {
  title: "Admin: Products | Resin Kalaakaari",
  robots: { index: false },
};

// Same order of checks as the orders page: signed in -> admin -> data.
export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  await requireAdmin("/admin/products");

  const query = parseAdminProductsQuery(await searchParams);
  const { products, totalCount } = await getAdminProducts(query);
  const totalPages = Math.max(
    1,
    Math.ceil(totalCount / ADMIN_PRODUCTS_PER_PAGE),
  );

  // ?page=999 (old bookmark): back to the last real page. redirect() throws
  // on purpose, so it must not sit inside a try/catch.
  if (query.page > totalPages) {
    redirect(buildAdminProductsHref({ ...query, page: totalPages }));
  }

  return (
    <AdminShell>
      <AdminProductsList
        products={products}
        search={query.search}
        page={query.page}
        totalPages={totalPages}
        totalCount={totalCount}
        showRebuildIndex={isAiAvailable(readAiConfig())}
      />
    </AdminShell>
  );
}
