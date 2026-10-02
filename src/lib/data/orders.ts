// Order data layer. Same idea as products.ts: every Supabase call for orders
// lives here, uses the SERVER client, and throws on unexpected errors.
// One difference: the two write functions below return a result for the
// failures we EXPECT (empty cart, bad UTR), because those are normal
// outcomes to show the customer, not crashes.
import { createServerSupabaseClient } from "@/lib/server";
import { isUuid } from "@/lib/orders";
import type {
  OrderDetail,
  OrderLine,
  OrderSummary,
  PayableOrder,
  ShippingDetails,
} from "@/lib/types";

// --- Reads ---
// Each read filters by user_id AND relies on RLS ("Users can view their own
// orders"). Two locks: if one is ever loosened by mistake, the other holds.

export async function getMyOrders(userId: string): Promise<OrderSummary[]> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("orders")
    // order_items(count) = how many lines each order has, in the same query.
    .select("id, created_at, total_price, status, order_items(count)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .order("id"); // tie-breaker, same reason as in getProducts

  if (error) throw new Error(`getMyOrders failed: ${error.message}`);

  const rows = (data ?? []) as unknown as (Omit<OrderSummary, "item_count"> & {
    order_items: { count: number }[];
  })[];
  return rows.map(({ order_items, ...order }) => ({
    ...order,
    item_count: order_items[0]?.count ?? 0,
  }));
}

type OrderDetailRow = Omit<OrderDetail, "lines"> & {
  order_items: (Omit<OrderLine, "product"> & {
    products: OrderLine["product"];
  })[];
};

// null = no such order OR it is not yours. Callers cannot tell the two apart
// (on purpose: it never confirms that someone else's order id exists).
export async function getMyOrderById(
  userId: string,
  orderId: string,
): Promise<OrderDetail | null> {
  if (!isUuid(orderId)) return null;
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("orders")
    .select(
      `id, created_at, status, total_price, transaction_id,
       full_name, phone, shipping_address, city, state, pincode,
       order_items(id, quantity, price_at_purchase, products(name, image_url))`,
    )
    .eq("id", orderId)
    .eq("user_id", userId)
    .order("created_at", { referencedTable: "order_items", ascending: true })
    .maybeSingle(); // no match -> null, not an error

  if (error) throw new Error(`getMyOrderById failed: ${error.message}`);
  if (!data) return null;

  const { order_items, ...order } = data as unknown as OrderDetailRow;
  return {
    ...order,
    lines: order_items.map(({ products, ...line }) => ({
      ...line,
      product: products,
    })),
  };
}

// Just what the payment page needs.
export async function getOrderForPayment(
  userId: string,
  orderId: string,
): Promise<PayableOrder | null> {
  if (!isUuid(orderId)) return null;
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("orders")
    .select("id, total_price, status, transaction_id")
    .eq("id", orderId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(`getOrderForPayment failed: ${error.message}`);
  return data as PayableOrder | null;
}

// --- Writes (each one is a Postgres function: see phase-6-orders.sql) ---

// The SQL functions raise exceptions whose message is a short code. If the
// message is one of the codes we know, hand it back; otherwise it is a real
// failure and the caller should throw.
export function knownFailure<T extends string>(
  known: readonly T[],
  message: string,
): T | undefined {
  return known.find((code) => code === message);
}

const CREATE_ORDER_FAILURES = [
  "not_authenticated",
  "cart_empty",
  "invalid_shipping",
  "invalid_quantity",
  "price_not_whole",
] as const;
export type CreateOrderFailure = (typeof CREATE_ORDER_FAILURES)[number];

export type CreateOrderResult =
  { ok: true; orderId: string } | { ok: false; reason: CreateOrderFailure };

// Creates an order from the signed-in user's SAVED cart, priced by the
// database, in one transaction. We send no prices and no user id: the
// function reads prices from products and the user from the login token.
export async function createOrder(
  shipping: ShippingDetails,
): Promise<CreateOrderResult> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase.rpc("create_order", {
    p_full_name: shipping.full_name,
    p_phone: shipping.phone,
    p_shipping_address: shipping.address_line,
    p_city: shipping.city,
    p_state: shipping.state,
    p_pincode: shipping.pincode,
  });

  if (error) {
    const reason = knownFailure(CREATE_ORDER_FAILURES, error.message);
    if (reason) return { ok: false, reason };
    throw new Error(`createOrder failed: ${error.message}`);
  }
  if (typeof data !== "string") {
    throw new Error("createOrder failed: no order id returned");
  }
  return { ok: true, orderId: data };
}

const PAYMENT_FAILURES = [
  "not_authenticated",
  "invalid_utr",
  "order_not_payable",
] as const;
export type PaymentFailure = (typeof PAYMENT_FAILURES)[number];

export type SubmitPaymentResult =
  { ok: true } | { ok: false; reason: PaymentFailure };

// Saves the UTR on the caller's own pending order and moves it to
// verifying_payment (which fires the invoice email trigger).
export async function submitPaymentProof(
  orderId: string,
  utr: string,
): Promise<SubmitPaymentResult> {
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase.rpc("submit_payment_proof", {
    p_order_id: orderId,
    p_utr: utr,
  });

  if (error) {
    const reason = knownFailure(PAYMENT_FAILURES, error.message);
    if (reason) return { ok: false, reason };
    throw new Error(`submitPaymentProof failed: ${error.message}`);
  }
  return { ok: true };
}
