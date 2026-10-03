// The real database wrapper. Uses the ADMIN client (it bypasses RLS), which is
// why every call below is narrow and why handler.ts decides what is allowed.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Db, ItemRow, OrderRow } from "./types.ts";

const ORDER_COLUMNS =
  "id, user_id, status, total_price, transaction_id, full_name, phone, " +
  "shipping_address, city, state, pincode, created_at";

export function makeDb(admin: SupabaseClient): Db {
  return {
    async verifySecret(secret) {
      const { data, error } = await admin.rpc("verify_order_email_secret", {
        p_secret: secret,
      });
      if (error) throw new Error(`verify secret failed: ${error.message}`);
      return data === true;
    },

    async getOrder(orderId) {
      const { data, error } = await admin
        .from("orders")
        .select(ORDER_COLUMNS)
        .eq("id", orderId)
        .maybeSingle();
      if (error) throw new Error(`read order failed: ${error.message}`);
      return (data as OrderRow | null) ?? null;
    },

    async getItems(orderId) {
      const { data, error } = await admin
        .from("order_items")
        .select("quantity, price_at_purchase, products(name)")
        .eq("order_id", orderId)
        .order("created_at", { ascending: true })
        .order("id");
      if (error) throw new Error(`read items failed: ${error.message}`);
      const rows = (data ?? []) as unknown as {
        quantity: number;
        price_at_purchase: number;
        products: { name: string } | null;
      }[];
      return rows.map((r): ItemRow => ({
        quantity: r.quantity,
        price_at_purchase: r.price_at_purchase,
        product_name: r.products?.name ?? null,
      }));
    },

    async getCustomerEmail(userId) {
      const { data, error } = await admin.auth.admin.getUserById(userId);
      if (error) throw new Error(`read user failed: ${error.message}`);
      return data.user?.email ?? null;
    },

    async claim(orderId, kind, utr) {
      const { data, error } = await admin.rpc("claim_order_email", {
        p_order_id: orderId,
        p_kind: kind,
        p_utr: utr,
      });
      if (error) throw new Error(`claim failed: ${error.message}`);
      return data === true;
    },

    async finish(orderId, kind, utr, result) {
      const { error } = await admin
        .from("order_email_log")
        .update(
          result.ok
            ? {
                status: "sent",
                provider_id: result.providerId,
                error: null,
                updated_at: new Date().toISOString(),
              }
            : {
                status: "failed",
                error: result.error.slice(0, 500),
                updated_at: new Date().toISOString(),
              },
        )
        .eq("order_id", orderId)
        .eq("kind", kind)
        .eq("utr", utr);
      if (error) throw new Error(`log update failed: ${error.message}`);
    },
  };
}
