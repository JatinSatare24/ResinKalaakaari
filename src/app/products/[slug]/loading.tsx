import LoadingUI from "@/components/LoadingUI/LoadingUI";

// Shown instantly while a single product page fetches its data.
export default function ProductLoading() {
  return <LoadingUI variant="detail" label="Loading product" />;
}
