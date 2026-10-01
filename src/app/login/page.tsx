import Login from "@/components/Login/Login";
import { safeNextPath } from "@/lib/safe-next";

// A query param can appear more than once (?next=a&next=b), so Next types it
// as string | string[]. Take the first value.
const first = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string | string[];
    next?: string | string[];
  }>;
}) {
  // Next 15+: searchParams is a Promise, so it must be awaited
  const { error, next } = await searchParams;
  return <Login authError={first(error)} next={safeNextPath(first(next))} />;
}
