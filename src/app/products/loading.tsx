import Loader from "@/components/Spinner/Spinner";

// Shown instantly while /products fetches its data. Next wraps page.tsx in
// a <Suspense> boundary for us and uses this file as the fallback.
export default function ProductsLoading() {
  return <Loader message="Loading products" />;
}
