import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AdminShell from "@/components/Admin/AdminShell/AdminShell";
import AdminOrders from "@/components/Admin/Orders/Orders";
import { requireAdmin } from "@/lib/auth";
import { ADMIN_ORDERS_PER_PAGE } from "@/lib/constants";
import { getAdminOrders } from "@/lib/data/admin-orders";
import {
  buildAdminOrdersHref,
  parsePageParam,
  type RawSearchParams,
} from "@/lib/search-params";

export const metadata: Metadata = {
  title: "Admin: Orders | Resin Kalaakaari",
  robots: { index: false },
};

// Server Component. Order of checks: signed in -> admin -> then (and only
// then) load the data. A non-admin gets the 404 page (see requireAdmin).
// Errors go to app/error.tsx; the wait is covered by admin/orders/loading.tsx.
// There is no admin not-found.tsx on purpose: a custom one would confirm
// that this area exists.
export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  await requireAdmin("/admin/orders");

  const page = parsePageParam(await searchParams);
  const { orders, totalCount } = await getAdminOrders(page);
  const totalPages = Math.max(1, Math.ceil(totalCount / ADMIN_ORDERS_PER_PAGE));

  // ?page=999 (old bookmark): back to a real page. redirect() throws on
  // purpose, so it must not sit inside a try/catch.
  if (page > totalPages) redirect(buildAdminOrdersHref(totalPages));

  return (
    <AdminShell>
      <AdminOrders
        orders={orders}
        page={page}
        totalPages={totalPages}
        totalCount={totalCount}
      />
    </AdminShell>
  );
}
