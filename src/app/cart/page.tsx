import type { Metadata } from "next";
import CartView from "@/components/CartView/CartView";

// metadata only works in Server Components. The old page was a client
// component (it read the cart), so it could not set a title. Now this page is
// a thin server component and CartView holds the client-side cart UI.
export const metadata: Metadata = {
  title: "Your Cart | Resin Kalaakari",
  // A cart is personal and empty for crawlers; keep it out of search results.
  robots: { index: false },
};

export default function CartPage() {
  return <CartView />;
}
