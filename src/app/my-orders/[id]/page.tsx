import type { Metadata } from "next";
import { notFound } from "next/navigation";
import MyOrderDetail from "@/components/MyOrderDetail/MyOrderDetail";
import { requireUser } from "@/lib/auth";
import { getMyOrderById } from "@/lib/data/orders";

export const metadata: Metadata = {
  title: "Order Details | Resin Kalaakaari",
  robots: { index: false },
};

// Server Component. The query filters by id AND user_id (and RLS checks it
// again), so another customer's order id simply gives "not found".
export default async function MyOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser(`/my-orders/${encodeURIComponent(id)}`);

  const order = await getMyOrderById(user.id, id);
  if (!order) notFound();

  return <MyOrderDetail order={order} />;
}
