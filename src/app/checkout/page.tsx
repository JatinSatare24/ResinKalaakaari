import type { Metadata } from "next";
import Checkout from "@/components/Checkout/Checkout";
import { requireUser } from "@/lib/auth";
import { EMPTY_SHIPPING } from "@/lib/checkout";
import { getShippingDefaults } from "@/lib/data/profile";

export const metadata: Metadata = {
  title: "Checkout | Resin Kalaakaari",
  robots: { index: false }, // personal page, keep it out of search results
};

// Server Component: it checks the user and loads the saved address on the
// server, so the form opens already filled (no loading spinner, no effect).
export default async function CheckoutPage() {
  const user = await requireUser("/checkout");

  // Pre-filling is a nicety. If it fails, show an empty form, not an error page.
  const initialShipping = await getShippingDefaults(user.id).catch((error) => {
    console.error("Checkout pre-fill failed:", error);
    return EMPTY_SHIPPING;
  });

  return <Checkout initialShipping={initialShipping} />;
}
