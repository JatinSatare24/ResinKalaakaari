import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Success from "@/components/Success/Success";
import { requireUser } from "@/lib/auth";
import { getOrderForPayment } from "@/lib/data/orders";

export const metadata: Metadata = {
  title: "Complete Your Payment | Resin Kalaakaari",
  robots: { index: false },
};

// Server Component: it loads the order on the server and shows not-found
// unless the order exists AND belongs to the signed-in user. The old version
// fetched it in the browser after the page had already rendered.
export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string | string[] }>;
}) {
  const { id: rawId } = await searchParams;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  if (!id) notFound();

  const user = await requireUser(
    `/checkout/success?id=${encodeURIComponent(id)}`,
  );
  const order = await getOrderForPayment(user.id, id);
  if (!order) notFound();

  return <Success order={order} />;
}
