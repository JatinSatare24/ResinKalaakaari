import Loader from "@/components/Spinner/Spinner";

// Shown while requireAdmin + the products query run.
export default function AdminProductsLoading() {
  return <Loader message="Loading products" />;
}
