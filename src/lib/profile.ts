// Pure profile rules: no React, no Supabase.
import { validateShipping, type ShippingErrors } from "@/lib/checkout";
import type { ShippingDetails } from "@/lib/types";

// A profile may be partly empty (you can save just a phone number), but
// anything you DO fill in must pass the same rules as checkout. So: run the
// checkout rules, then forget the errors for fields left blank.
export function validateProfile(details: ShippingDetails): ShippingErrors {
  const errors = validateShipping(details);
  for (const key of Object.keys(errors) as (keyof ShippingDetails)[]) {
    if (details[key] === "") delete errors[key];
  }
  return errors;
}
