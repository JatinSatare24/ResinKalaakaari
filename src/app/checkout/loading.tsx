import Loader from "@/components/Spinner/Spinner";

// Shown while /checkout (and /checkout/success) fetch their data on the
// server. Next wraps the page in <Suspense> and uses this as the fallback.
export default function CheckoutLoading() {
  return <Loader message="Loading checkout" />;
}
