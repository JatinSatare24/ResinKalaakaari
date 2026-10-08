"use server";

// Server Actions are public endpoints (see admin/orders/actions.ts). Each one
// checks WHO is calling (admin), WHAT they sent (the same rules the form
// ran, run again here), and then admin_create_product / admin_update_product
// check the role and the rules a third time inside the database.
import { revalidatePath } from "next/cache";
import { getCurrentUser, getIsAdmin } from "@/lib/auth";
import {
  createProduct,
  updateProduct,
  type CreateProductFailure,
  type UpdateProductFailure,
} from "@/lib/data/admin-products";
import { deleteProductImage } from "@/lib/data/product-images";
import { isUuid } from "@/lib/orders";
import {
  parseProductForm,
  validateProduct,
  type ProductFormErrors,
  type ProductInput,
} from "@/lib/product-admin";

const MESSAGES: Record<CreateProductFailure | UpdateProductFailure, string> = {
  not_authenticated: "Your session has expired. Please sign in again.",
  not_admin: "You don't have permission to do this.",
  invalid_name: "Check the product name.",
  invalid_description: "Check the description.",
  invalid_price: "Check the price: whole rupees only.",
  invalid_image: "Check the photo.",
  category_not_found: "That category no longer exists. Choose another.",
  slug_unavailable:
    "Could not make a link for that name. Try a different name.",
  product_not_found: "That product no longer exists.",
};

// `errors` is set when a particular field is wrong, so the form can show the
// message next to it.
export type ProductActionResult<T extends object = object> =
  | ({ ok: true } & T)
  | { ok: false; message: string; errors?: ProductFormErrors };

// The checks both actions share, in order: signed in, admin, valid input.
async function prepare(
  values: unknown,
): Promise<
  | { ok: true; input: ProductInput }
  | { ok: false; message: string; errors?: ProductFormErrors }
> {
  if (!(await getCurrentUser())) {
    return { ok: false, message: MESSAGES.not_authenticated };
  }
  if (!(await getIsAdmin())) return { ok: false, message: MESSAGES.not_admin };

  const check = validateProduct(parseProductForm(values));
  if (!check.ok) {
    return {
      ok: false,
      message: "Some fields need a change. See the red messages.",
      errors: check.errors,
    };
  }
  return { ok: true, input: check.value };
}

// The list, the dashboard count and the shop all read these rows. The shop
// pages are rendered on every request, so only the admin pages need a nudge.
function refresh() {
  revalidatePath("/admin/products");
  revalidatePath("/admin");
}

export async function createProductAction(
  values: unknown,
): Promise<ProductActionResult<{ id: string }>> {
  const prepared = await prepare(values);
  if (!prepared.ok) return prepared;

  let result;
  try {
    result = await createProduct(prepared.input);
  } catch (error) {
    console.error(error);
    return { ok: false, message: "Could not add the product. Try again." };
  }
  if (!result.ok) return { ok: false, message: MESSAGES[result.reason] };

  refresh();
  return { ok: true, id: result.id };
}

export async function updateProductAction(
  id: unknown,
  values: unknown,
): Promise<ProductActionResult> {
  const prepared = await prepare(values);
  if (!prepared.ok) return prepared;

  if (typeof id !== "string" || !isUuid(id)) {
    return { ok: false, message: MESSAGES.product_not_found };
  }

  let result;
  try {
    result = await updateProduct(id, prepared.input);
  } catch (error) {
    console.error(error);
    return { ok: false, message: "Could not save the product. Try again." };
  }
  if (!result.ok) return { ok: false, message: MESSAGES[result.reason] };

  // The old photo, when no product uses it any more (the database decides).
  // After the save, so a failed delete can never undo it.
  await deleteProductImage(result.replacedImageUrl);

  refresh();
  return { ok: true };
}
