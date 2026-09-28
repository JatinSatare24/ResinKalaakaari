"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";
import ErrorUI from "@/components/ErrorUI/ErrorUI";

// Catches anything thrown while rendering a page below the root layout,
// e.g. getProducts() throwing because Supabase is down.
export default function ErrorPage({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    // In production `error.message` is hidden for server errors; the digest
    // is an id you can match against the server logs.
    console.error(error);
  }, [error]);

  return (
    <ErrorUI
      title="Something went wrong"
      message="We couldn't load this page. Please try again in a moment."
      // Re-fetches the data and re-renders the page that failed.
      onRetry={unstable_retry}
    />
  );
}
