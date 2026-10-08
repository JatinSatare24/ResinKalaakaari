// Pure rules for the admin product and category forms (no React, no Supabase).
// Same three locks as checkout.ts: the browser runs these for instant
// feedback, the Server Action runs them again (never trust the browser), and
// the admin_* SQL functions enforce the same rules a third time.
// The limits live in lib/constants.ts; keep them in step with
// phase-10-product-admin-A.sql.
import { isRecord } from "@/lib/cart";
import {
  MAX_CATEGORY_NAME_LENGTH,
  MAX_PRODUCT_DESCRIPTION_LENGTH,
  MAX_PRODUCT_NAME_LENGTH,
  MAX_PRODUCT_PRICE,
  MIN_PRODUCT_PRICE,
  PRODUCT_IMAGE_BUCKET,
} from "@/lib/constants";
import { isUuid } from "@/lib/orders";

// What the form holds while the owner types. The price stays a string so
// "45", "45.5" and "" can all be shown and judged.
export type ProductFormValues = {
  name: string;
  description: string;
  price: string;
  image_url: string;
  category_id: string;
  is_featured: boolean;
  is_gallery: boolean;
};

// What the database functions receive: only possible after validation.
export type ProductInput = Omit<ProductFormValues, "price"> & {
  price: number; // a whole number of rupees
};

export type ProductField =
  "name" | "description" | "price" | "image_url" | "category_id";
export type ProductFormErrors = Partial<Record<ProductField, string>>;

export type ProductCheck =
  { ok: true; value: ProductInput } | { ok: false; errors: ProductFormErrors };

export const EMPTY_PRODUCT_FORM: ProductFormValues = {
  name: "",
  description: "",
  price: "",
  image_url: "",
  category_id: "",
  is_featured: false,
  is_gallery: false,
};

// Counts characters the way Postgres char_length does (an emoji is ONE).
// String.length would count it as two and could refuse text the database
// accepts. Also used for the live counter under the description box.
export function charLength(text: string): number {
  return Array.from(text).length;
}

// A Server Action's argument can be ANYTHING a client sends. This copies out
// only the known fields: text is trimmed, a wrong type becomes "" / false.
export function parseProductForm(value: unknown): ProductFormValues {
  const source = isRecord(value) ? value : {};
  const text = (key: string): string => {
    const field = source[key];
    return typeof field === "string" ? field.trim() : "";
  };
  const priceField = source.price;
  return {
    name: text("name"),
    description: text("description"),
    price:
      typeof priceField === "number" && Number.isFinite(priceField)
        ? String(priceField)
        : text("price"),
    image_url: text("image_url"),
    category_id: text("category_id"),
    is_featured: source.is_featured === true,
    is_gallery: source.is_gallery === true,
  };
}

// "4,999" and "4 999" are fine; "99.50" and "Rs 99" are not. Whole rupees
// only, because orders store whole numbers (create_order refuses paise).
function checkPrice(text: string): { price: number } | { error: string } {
  const cleaned = text.replace(/[\s,]/g, "");
  if (cleaned === "")
    return { error: "Enter a price in whole rupees, like 450." };
  if (!/^\d+$/.test(cleaned)) {
    return { error: "Use whole rupees only, like 450 (no paise or symbols)." };
  }
  const price = Number(cleaned);
  if (price < MIN_PRODUCT_PRICE) {
    return { error: `The price must be at least ₹${MIN_PRODUCT_PRICE}.` };
  }
  if (price > MAX_PRODUCT_PRICE) {
    return {
      error: `The price can be ₹${MAX_PRODUCT_PRICE.toLocaleString("en-IN")} at most. Check for an extra zero.`,
    };
  }
  return { price };
}

// The photo must be a public link inside the product images bucket, with no
// ?query or #hash (same rule as c_image_re in the SQL functions).
function isProductImageUrl(url: string): boolean {
  const prefix = `/storage/v1/object/public/${encodeURIComponent(PRODUCT_IMAGE_BUCKET)}/`;
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === "https:" &&
      parsed.pathname.startsWith(prefix) &&
      parsed.pathname.length > prefix.length &&
      parsed.search === "" &&
      parsed.hash === ""
    );
  } catch {
    return false; // not a URL at all
  }
}

// Keep these rules in step with admin_create_product / admin_update_product.
export function validateProduct(values: ProductFormValues): ProductCheck {
  const errors: ProductFormErrors = {};

  if (!values.name) errors.name = "Enter the product name.";
  else if (charLength(values.name) > MAX_PRODUCT_NAME_LENGTH) {
    errors.name = `The name is too long (${MAX_PRODUCT_NAME_LENGTH} characters at most).`;
  }

  const descriptionLength = charLength(values.description);
  if (!values.description) errors.description = "Enter a description.";
  else if (descriptionLength > MAX_PRODUCT_DESCRIPTION_LENGTH) {
    errors.description = `The description is too long (${MAX_PRODUCT_DESCRIPTION_LENGTH} characters at most, you have ${descriptionLength}).`;
  }

  const priceCheck = checkPrice(values.price);
  if ("error" in priceCheck) errors.price = priceCheck.error;

  if (!values.image_url) errors.image_url = "Add a photo for this product.";
  else if (!isProductImageUrl(values.image_url)) {
    errors.image_url = "That photo is not from this shop. Choose it again.";
  }

  if (!isUuid(values.category_id)) errors.category_id = "Choose a category.";

  if (Object.keys(errors).length > 0 || "error" in priceCheck) {
    return { ok: false, errors };
  }
  return { ok: true, value: { ...values, price: priceCheck.price } };
}

// --- Categories ---

export type CategoryNameCheck =
  { ok: true; name: string } | { ok: false; error: string };

// Same rules as admin_create_category / admin_rename_category. Takes
// `unknown` because a Server Action argument can be anything.
export function checkCategoryName(value: unknown): CategoryNameCheck {
  const name = typeof value === "string" ? value.trim() : "";
  if (!name) return { ok: false, error: "Enter the category name." };
  if (charLength(name) > MAX_CATEGORY_NAME_LENGTH) {
    return {
      ok: false,
      error: `The name is too long (${MAX_CATEGORY_NAME_LENGTH} characters at most).`,
    };
  }
  return { ok: true, name };
}
