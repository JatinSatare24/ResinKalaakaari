// Numbers for the /admin dashboard cards. Server client only. Orders are
// readable because of the policy "Admins can view all orders"; products and
// categories have a public read policy.
import { createServerSupabaseClient } from "@/lib/server";

export type AdminCounts = {
  orders: number; // every order
  ordersToCheck: number; // payment proof sent, waiting for the owner to verify
  products: number;
  categories: number;
};

export async function getAdminCounts(): Promise<AdminCounts> {
  const supabase = await createServerSupabaseClient();

  // head: true = Postgres counts the rows and sends back no rows at all.
  const countOnly = { count: "exact", head: true } as const;

  // Four small queries at the same time.
  const [orders, ordersToCheck, products, categories] = await Promise.all([
    supabase.from("orders").select("id", countOnly),
    supabase
      .from("orders")
      .select("id", countOnly)
      .eq("status", "verifying_payment"),
    supabase.from("products").select("id", countOnly),
    supabase.from("categories").select("id", countOnly),
  ]);

  const failed = [orders, ordersToCheck, products, categories].find(
    (result) => result.error,
  );
  if (failed?.error) {
    throw new Error(`getAdminCounts failed: ${failed.error.message}`);
  }

  return {
    orders: orders.count ?? 0,
    ordersToCheck: ordersToCheck.count ?? 0,
    products: products.count ?? 0,
    categories: categories.count ?? 0,
  };
}
