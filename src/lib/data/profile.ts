// Profile data layer (server client). For now only what checkout needs.
import { createServerSupabaseClient } from "@/lib/server";
import type { ShippingDetails } from "@/lib/types";

// The saved address, to pre-fill the checkout form. A user with no profile
// row (or empty columns) just gets empty strings.
export async function getShippingDefaults(
  userId: string,
): Promise<ShippingDetails> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("full_name, phone, address_line, city, state, pincode")
    .eq("id", userId)
    .maybeSingle(); // a brand new user may have no row yet

  if (error) throw new Error(`getShippingDefaults failed: ${error.message}`);

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
