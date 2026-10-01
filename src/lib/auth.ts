// Server-side "who is signed in" helpers for Server Components and actions.
import { cache } from "react";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/server";

// getUser() asks Supabase's auth server to verify the token (getSession()
// only reads the cookie, which can be forged, so it must not be trusted on
// the server). cache() = one check per request, however many callers.
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

// proxy.ts is only the first, optimistic gate. Every protected page also
// calls this, so a page can never render for a guest even if the proxy
// matcher changes. `returnTo` is where login should send them back to.
export async function requireUser(returnTo: string): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  return user;
}
