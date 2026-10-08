import Loader from "@/components/Spinner/Spinner";

// Shown while requireAdmin + the categories query run.
export default function AdminCategoriesLoading() {
  return <Loader message="Loading categories" />;
}
