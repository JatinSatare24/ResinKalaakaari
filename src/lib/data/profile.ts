// Profile data layer (server client). The signed-in user's saved details:
// pre-fills the checkout form and powers the /profile page.
import { createServerSupabaseClient } from "@/lib/server";
import type { ShippingDetails } from "@/lib/types";

// The saved details. A user with no profile row (or empty columns) just gets
// empty strings. RLS ("Users can view their own profile") limits the row to
// the owner; the .eq() is the second lock.
export async function getProfile(userId: string): Promise<ShippingDetails> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("full_name, phone, address_line, city, state, pincode")
    .eq("id", userId)
    .maybeSingle(); // a brand new user may have no row yet

  if (error) throw new Error(`getProfile failed: ${error.message}`);

  const row: Partial<Record<keyof ShippingDetails, string | null>> = data ?? {};
  return {
    full_name: row.full_name ?? "",
    phone: row.phone ?? "",
    address_line: row.address_line ?? "",
    city: row.city ?? "",
    state: row.state ?? "",
    pincode: row.pincode ?? "",
  };
}

// Checkout reads the same six fields under its own name.
export const getShippingDefaults = getProfile;

// Saves the six fields. upsert (not update) because an update on a missing
// row changes nothing and reports no error. Only the columns we send are
// touched, so avatar_url and created_at are left alone.
// RLS: "Users can insert/update their own profile" (auth.uid() = id), so a
// user cannot write anyone else's row even if they pass another id.
export async function updateProfile(
  userId: string,
  details: ShippingDetails,
): Promise<void> {
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase
    .from("profiles")
    .upsert({ id: userId, ...details }, { onConflict: "id" });

  if (error) throw new Error(`updateProfile failed: ${error.message}`);
}
