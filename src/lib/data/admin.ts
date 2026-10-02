// "Is the caller an admin?" Asks the database, which is the only place that
// knows (the admin_users table is hidden from the API; is_admin() is a
// SECURITY DEFINER function that reads it for us).
// Takes the Supabase client as an argument, like cart.ts, because two callers
// need it: the server (lib/auth.ts) and the Navbar (browser, UI hint only).
import type { SupabaseClient } from "@supabase/supabase-js";

export async function isAdmin(supabase: SupabaseClient): Promise<boolean> {
  const { data, error } = await supabase.rpc("is_admin");
  if (error) throw new Error(`isAdmin failed: ${error.message}`);
  return data === true; // anything else (null, error) means "not admin"
}
