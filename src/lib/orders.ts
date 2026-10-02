// Pure order helpers: no React, no Supabase.
import type { OrderLine } from "@/lib/types";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// A malformed id (e.g. /my-orders/abc) makes Postgres throw "invalid uuid".
// Checking first lets the page show "not found" instead of an error page.
export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

// Every status an order moves through, in the usual order.
export const ORDER_STATUSES = [
  "pending",
  "verifying_payment",
  "in-process",
  "confirmed",
  "shipped",
  "delivered",
] as const;

// What the ADMIN may set. "verifying_payment" is left out on purpose: it is
// the customer's move (submit_payment_proof), and entering it sends the
// invoice email, so an admin click must never be able to trigger it.
// Keep in step with admin_set_order_status in phase-7-admin.sql.
export const ADMIN_SETTABLE_STATUSES = [
  "pending",
  "in-process",
  "confirmed",
  "shipped",
  "delivered",
] as const;
export type AdminSettableStatus = (typeof ADMIN_SETTABLE_STATUSES)[number];

// A server action's argument can be anything, so check before trusting it.
export function isAdminSettableStatus(
  value: unknown,
): value is AdminSettableStatus {
  return (
    typeof value === "string" &&
    (ADMIN_SETTABLE_STATUSES as readonly string[]).includes(value)
  );
}

// "9f1c2ab4-..." -> "9F1C2AB4": the short id customers see and quote.
export function shortOrderId(id: string): string {
  return id.slice(0, 8).toUpperCase();
}

// "verifying_payment" -> "Verifying payment", "in-process" -> "In process".
export function formatStatus(status: string): string {
  const text = status.replace(/[_-]+/g, " ").trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// Sum of the lines. Shipping is then total - subtotal, so no page has to
// hardcode the shipping fee.
export function orderSubtotal(lines: OrderLine[]): number {
  return lines.reduce(
    (sum, line) => sum + line.price_at_purchase * line.quantity,
    0,
  );
}
