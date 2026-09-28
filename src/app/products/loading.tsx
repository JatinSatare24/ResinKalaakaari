import LoadingUI from "@/components/LoadingUI/LoadingUI";

// Shown instantly while /products fetches its data. Next wraps page.tsx in
// a <Suspense> boundary for us and uses this file as the fallback.
export default function ProductsLoading() {
  return <LoadingUI variant="grid" label="Loading products" />;
}
