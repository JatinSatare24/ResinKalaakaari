// Pure checkout rules. The browser runs them for instant feedback, the
// server action runs them again (never trust the browser), and the
// create_order SQL function enforces the same rules a third time.
import { isRecord } from "@/lib/cart";
import type { ShippingDetails } from "@/lib/types";

export const EMPTY_SHIPPING: ShippingDetails = {
  full_name: "",
  phone: "",
  address_line: "",
  city: "",
  state: "",
  pincode: "",
};

export type ShippingErrors = Partial<Record<keyof ShippingDetails, string>>;

// A server action's argument can be ANYTHING a client sends. This copies out
// only the six known fields, as trimmed strings (missing or wrong type = "").
export function parseShipping(value: unknown): ShippingDetails {
  const source = isRecord(value) ? value : {};
  const read = (key: keyof ShippingDetails): string => {
    const field = source[key];
    return typeof field === "string" ? field.trim() : "";
  };
  return {
    full_name: read("full_name"),
    phone: read("phone"),
    address_line: read("address_line"),
    city: read("city"),
    state: read("state"),
    pincode: read("pincode"),
  };
}

// Keep these rules in step with create_order in the SQL file.
export function validateShipping(shipping: ShippingDetails): ShippingErrors {
  const errors: ShippingErrors = {};

  if (!shipping.full_name) errors.full_name = "Enter your full name.";
  else if (shipping.full_name.length > 100)
    errors.full_name = "Name is too long.";

  const phoneDigits = shipping.phone.replace(/\D/g, "").length;
  if (phoneDigits < 10 || phoneDigits > 13) {
    errors.phone = "Enter a valid phone number (10 to 13 digits).";
  }

  if (!shipping.address_line) errors.address_line = "Enter your address.";
  else if (shipping.address_line.length > 300) {
    errors.address_line = "Address is too long (300 characters at most).";
  }

  if (!shipping.city) errors.city = "Enter your city.";
  else if (shipping.city.length > 100) errors.city = "City name is too long.";

  if (!shipping.state) errors.state = "Enter your state.";
  else if (shipping.state.length > 100)
    errors.state = "State name is too long.";

  if (!/^[0-9]{6}$/.test(shipping.pincode)) {
    errors.pincode = "Enter a 6-digit pincode.";
  }

  return errors;
}

export function hasErrors(errors: ShippingErrors): boolean {
  return Object.keys(errors).length > 0;
}
