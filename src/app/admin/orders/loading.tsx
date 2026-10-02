import Loader from "@/components/Spinner/Spinner";

// Shown while requireAdmin + the orders query run.
export default function AdminOrdersLoading() {
  return <Loader message="Loading orders" />;
}
