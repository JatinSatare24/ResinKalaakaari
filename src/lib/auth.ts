// Server-side "who is signed in" helpers for Server Components and actions.
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { isAdmin } from "@/lib/data/admin";
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

// Is the signed-in user an admin? Asks the database (is_admin()), never a
// cookie, a header or a value the browser sent. cache() = one check per request.
export const getIsAdmin = cache(async (): Promise<boolean> => {
  const user = await getCurrentUser();
  if (!user) return false;
  return isAdmin(await createServerSupabaseClient());
});

// For admin pages. A guest goes to login; a signed-in non-admin gets the
// normal 404, so the page does not even confirm that /admin exists.
// (forbidden() would be the 403 version, but it is still experimental.)
export async function requireAdmin(returnTo: string): Promise<User> {
  const user = await requireUser(returnTo);
  if (!(await getIsAdmin())) notFound();
  return user;
}
