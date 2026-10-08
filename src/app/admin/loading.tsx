import Loader from "@/components/Spinner/Spinner";

// Shown while requireAdmin + the dashboard counts run.
export default function AdminLoading() {
  return <Loader message="Loading admin" />;
}
