import Loader from "@/components/Spinner/Spinner";

// Shown instantly while a single product page fetches its data.
export default function ProductLoading() {
  return <Loader message="Loading product" />;
}