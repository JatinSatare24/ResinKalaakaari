import type { Metadata } from "next";
import MyOrders from "@/components/MyOrders/MyOrders";
import { requireUser } from "@/lib/auth";
import { getMyOrders } from "@/lib/data/orders";

export const metadata: Metadata = {
  title: "My Orders | Resin Kalaakaari",
  robots: { index: false },
};

// Server Component: the orders are fetched on the server and arrive in the
// HTML, instead of a spinner + browser fetch after load. Errors go to
// app/error.tsx, the wait is covered by my-orders/loading.tsx.
export default async function MyOrdersPage() {
  const user = await requireUser("/my-orders");
  const orders = await getMyOrders(user.id);
  return <MyOrders orders={orders} />;
}
