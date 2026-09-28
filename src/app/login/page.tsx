import Login from "@/components/Login/Login";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  // Next 15+: searchParams is a Promise, so it must be awaited
  const { error } = await searchParams;
  return <Login authError={error} />;
}
