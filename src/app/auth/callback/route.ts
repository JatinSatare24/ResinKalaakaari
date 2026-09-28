import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/server";
import { type EmailOtpType } from "@supabase/supabase-js";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);

  // 1. Extract all possible parameters
  const code = requestUrl.searchParams.get("code");
  const token_hash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type") as EmailOtpType | null;
  const next = requestUrl.searchParams.get("next") ?? "/";

  const supabase = await createServerSupabaseClient();

  // 2. Handle Google/Social Login (The 'code' flow)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return redirectToError(requestUrl, error.message);
  }

  // 3. Handle Email Links (The 'token_hash' flow from your template)
  else if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type,
    });
    if (error) return redirectToError(requestUrl, error.message);
  }

  // 4. Fallback if neither is present
  else {
    return redirectToError(requestUrl, "Invalid authentication parameters");
  }

  // 5. Success! Redirect to the destination
  // Resolve `next` against our origin, then check it still points at us.
  // Catches "//evil.com" and "/\evil.com", which startsWith("/") lets through.
  const target = new URL(next, requestUrl.origin);
  const safeTarget =
    target.origin === requestUrl.origin ? target : new URL("/", requestUrl.origin);
  return NextResponse.redirect(safeTarget);
}

// Helper to handle error redirects cleanly
function redirectToError(requestUrl: URL, message: string) {
  console.error("Auth Callback Error:", message);
  // Redirect back to login with a friendly error message
  const errorUrl = new URL("/login", requestUrl.origin);
  errorUrl.searchParams.set("error", "auth_failed"); // short code, not raw text
  return NextResponse.redirect(errorUrl);
}