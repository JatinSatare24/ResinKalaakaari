// Admin order data layer. Server client only. Reads rely on the RLS policy
// "Admins can view all orders"; the one write goes through the Postgres
// function admin_set_order_status, which checks is_admin() itself.
// Pages and actions check the role first (requireAdmin / getIsAdmin), the
// database checks it again: two locks, same as the customer pages.
import { createServerSupabaseClient } from "@/lib/server";
import { ADMIN_ORDERS_PER_PAGE } from "@/lib/constants";
import { knownFailure } from "@/lib/data/orders";
import type { AdminSettableStatus } from "@/lib/orders";
import type { AdminOrder } from "@/lib/types";

// orders.status can be NULL in the database (no NOT NULL on the column).
type AdminOrderRow = Omit<AdminOrder, "status"> & { status: string | null };

export type AdminOrdersResult = {
  orders: AdminOrder[]; // just this page, newest first
  totalCount: number; // all orders, across every page
};

export async function getAdminOrders(page: number): Promise<AdminOrdersResult> {
  const supabase = await createServerSupabaseClient();

  // Page 1 -> rows 0..19. Supabase counts both ends.
  const from = (page - 1) * ADMIN_ORDERS_PER_PAGE;
  const to = from + ADMIN_ORDERS_PER_PAGE - 1;

  const { data, error, count } = await supabase
    .from("orders")
    // Only the columns the table shows. (select("*") would also pull the
    // customer's address and phone for no reason.)
    .select("id, created_at, transaction_id, full_name, total_price, status", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .order("id") // tie-breaker, same reason as in getProducts
    .range(from, to);

  if (error) {
    // PGRST103 = page past the end. The page turns this into a redirect.
    if (error.code === "PGRST103") return { orders: [], totalCount: 0 };
    throw new Error(`getAdminOrders failed: ${error.message}`);
  }

  const rows = (data ?? []) as unknown as AdminOrderRow[];
  return {
    // A NULL status would crash the badge text, so show it as "pending"
    // (the column's default).
    orders: rows.map((row) => ({ ...row, status: row.status ?? "pending" })),
    totalCount: count ?? 0,
  };
}

const STATUS_FAILURES = [
  "not_authenticated",
  "not_admin",
  "invalid_status",
  "order_not_found",
] as const;
export type SetStatusFailure = (typeof STATUS_FAILURES)[number];

export type SetOrderStatusResult =
  { ok: true } | { ok: false; reason: SetStatusFailure };

// The status is typed AdminSettableStatus so a caller cannot even compile
// with a bad value; the SQL function re-checks it anyway.
export async function setOrderStatus(
  orderId: string,
  status: AdminSettableStatus,
): Promise<SetOrderStatusResult> {
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase.rpc("admin_set_order_status", {
    p_order_id: orderId,
    p_status: status,
  });

  if (error) {
    const reason = knownFailure(STATUS_FAILURES, error.message);
    if (reason) return { ok: false, reason };
    throw new Error(`setOrderStatus failed: ${error.message}`);
  }
  return { ok: true };
}
