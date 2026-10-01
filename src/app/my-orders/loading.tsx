import Loader from "@/components/Spinner/Spinner";

// Covers /my-orders and /my-orders/[id] (a loading.tsx wraps every page
// below its folder).
export default function MyOrdersLoading() {
  return <Loader message="Loading your orders" />;
}
