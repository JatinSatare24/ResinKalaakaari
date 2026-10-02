"use server";

// Server Actions are public endpoints: anyone can POST to one with any
// argument, whatever the page showed. So this one checks WHO is calling
// (admin), WHAT they sent (a real order id and an allowed status), and then
// the database checks the role again inside admin_set_order_status.
import { revalidatePath } from "next/cache";
import { getCurrentUser, getIsAdmin } from "@/lib/auth";
import { setOrderStatus, type SetStatusFailure } from "@/lib/data/admin-orders";
import { isAdminSettableStatus, isUuid } from "@/lib/orders";

const MESSAGES: Record<SetStatusFailure, string> = {
  not_authenticated: "Your session has expired. Please sign in again.",
  not_admin: "You don't have permission to do this.",
  invalid_status: "That status can't be set here.",
  order_not_found: "That order no longer exists.",
};

export type UpdateOrderStatusResult =
  { ok: true } | { ok: false; message: string };

export async function updateOrderStatus(
  orderId: unknown,
  status: unknown,
): Promise<UpdateOrderStatusResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: MESSAGES.not_authenticated };
  if (!(await getIsAdmin())) return { ok: false, message: MESSAGES.not_admin };

  if (typeof orderId !== "string" || !isUuid(orderId)) {
    return { ok: false, message: MESSAGES.order_not_found };
  }
  if (!isAdminSettableStatus(status)) {
    return { ok: false, message: MESSAGES.invalid_status };
  }

  let result;
  try {
    result = await setOrderStatus(orderId, status);
  } catch (error) {
    // An unexpected failure (database down): show it next to the select.
    console.error(error);
    return { ok: false, message: "Could not update the status. Try again." };
  }
  if (!result.ok) return { ok: false, message: MESSAGES[result.reason] };

  // Re-reads the list on the server and sends it back with this response,
  // so the badge updates without any client-side state of ours.
  revalidatePath("/admin/orders");
  return { ok: true };
}
