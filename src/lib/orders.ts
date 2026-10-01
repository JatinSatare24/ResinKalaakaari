// Pure order helpers: no React, no Supabase.
import type { OrderLine } from "@/lib/types";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// A malformed id (e.g. /my-orders/abc) makes Postgres throw "invalid uuid".
// Checking first lets the page show "not found" instead of an error page.
export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
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
