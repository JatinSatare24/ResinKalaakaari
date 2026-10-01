"use server";

// Server Actions = functions that run ONLY on the server but can be called
// from a client component like a normal async function. Anyone can call
// them with any argument (they are public endpoints), so each one checks
// who is calling and re-validates everything it receives.
import { getCurrentUser } from "@/lib/auth";
import {
  hasErrors,
  parseShipping,
  validateShipping,
  type ShippingErrors,
} from "@/lib/checkout";
import { UTR_LENGTH } from "@/lib/constants";
import {
  createOrder,
  submitPaymentProof,
  type CreateOrderFailure,
  type PaymentFailure,
} from "@/lib/data/orders";
import { isUuid } from "@/lib/orders";

const SIGN_IN_AGAIN = "Your session has expired. Please sign in again.";

const PLACE_ORDER_MESSAGES: Record<CreateOrderFailure, string> = {
  not_authenticated: SIGN_IN_AGAIN,
  cart_empty:
    "Your cart is empty. If you just placed an order, you can find it in My Orders.",
  invalid_shipping: "Please check your shipping details and try again.",
  invalid_quantity: "One of the quantities in your cart is not valid.",
  price_not_whole:
    "One of the products has a price we can't process. Please contact us.",
};

const PAYMENT_MESSAGES: Record<PaymentFailure, string> = {
  not_authenticated: SIGN_IN_AGAIN,
  invalid_utr: `Enter the ${UTR_LENGTH}-character UTR / transaction ID.`,
  order_not_payable:
    "This order can't take a payment reference any more. Check My Orders for its status.",
};

export type PlaceOrderResult =
  | { ok: true; orderId: string }
  | { ok: false; message: string; fieldErrors?: ShippingErrors };

// Creates the order. The browser sends ONLY the shipping details: the cart
// is read from the database and priced there (see create_order).
export async function placeOrder(input: unknown): Promise<PlaceOrderResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: SIGN_IN_AGAIN };

  const shipping = parseShipping(input);
  const fieldErrors = validateShipping(shipping);
  if (hasErrors(fieldErrors)) {
    return {
      ok: false,
      message: "Please fix the highlighted fields.",
      fieldErrors,
    };
  }

  const result = await createOrder(shipping);
  if (result.ok) return result;
  return { ok: false, message: PLACE_ORDER_MESSAGES[result.reason] };
}

export type SubmitPaymentResult = { ok: true } | { ok: false; message: string };

// Saves the customer's UTR on their own pending order.
export async function submitPayment(
  orderId: unknown,
  utr: unknown,
): Promise<SubmitPaymentResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: SIGN_IN_AGAIN };

  if (typeof orderId !== "string" || !isUuid(orderId)) {
    return { ok: false, message: PAYMENT_MESSAGES.order_not_payable };
  }
  if (typeof utr !== "string") {
    return { ok: false, message: PAYMENT_MESSAGES.invalid_utr };
  }

  const result = await submitPaymentProof(orderId, utr);
  if (result.ok) return result;
  return { ok: false, message: PAYMENT_MESSAGES[result.reason] };
}
