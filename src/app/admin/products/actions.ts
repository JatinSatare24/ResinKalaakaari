"use server";

// Server Actions are public endpoints (see admin/orders/actions.ts). Each one
// checks WHO is calling (admin), WHAT they sent (the same rules the form
// ran, run again here), and then the admin_*_with_photos SQL functions check
// the role and the rules a third time inside the database. Those two save a
// product's text and its whole photo list in ONE transaction: all of it is
// stored, or none of it.
import { revalidatePath } from "next/cache";
import { getCurrentUser, getIsAdmin } from "@/lib/auth";
import { isAiAvailable, readAiConfig } from "@/lib/ai/config";
import { rebuildSearchIndex, syncProductEmbedding } from "@/lib/ai/embed-sync";
import { buildEmbedSyncDeps } from "@/lib/ai/live-deps";
import { MAX_PRODUCT_PHOTOS } from "@/lib/constants";
import {
  createProductWithPhotos,
  updateProductWithPhotos,
  type CreateWithPhotosFailure,
  type UpdateWithPhotosFailure,
} from "@/lib/data/admin-products";
import { deleteProductImages } from "@/lib/data/product-images";
import { isUuid } from "@/lib/orders";
import {
  parseProductForm,
  validateProduct,
  type ProductFormErrors,
  type ProductInput,
} from "@/lib/product-admin";

type SaveFailure = CreateWithPhotosFailure | UpdateWithPhotosFailure;

const MESSAGES: Record<SaveFailure, string> = {
  not_authenticated: "Your session has expired. Please sign in again.",
  not_admin: "You don't have permission to do this.",
  invalid_name: "Check the product name.",
  invalid_description: "Check the description.",
  invalid_price: "Check the price: whole rupees only.",
  invalid_image:
    "Check the photos. Remove any that look wrong and add them again.",
  too_many_photos: `A product can have ${MAX_PRODUCT_PHOTOS} photos at most. Remove one first.`,
  duplicate_photo: "The same photo was added twice.",
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

// A refusal from the database. A problem with the photo list is shown next to
// the photos, like the checks the form ran itself.
function refusal(reason: SaveFailure): {
  ok: false;
  message: string;
  errors?: ProductFormErrors;
} {
  if (
    reason === "invalid_image" ||
    reason === "too_many_photos" ||
    reason === "duplicate_photo"
  ) {
    return {
      ok: false,
      message: "Some fields need a change. See the red messages.",
      errors: { photos: MESSAGES[reason] },
    };
  }
  return { ok: false, message: MESSAGES[reason] };
}

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

// Keeps the assistant's search index in step with the product that was just
// saved. Best effort: it never throws and never changes the save's result. If
// the assistant is off, or the embedding fails or times out, the product is
// still saved, and the "Rebuild search index" button catches up later.
async function indexProduct(id: string) {
  const config = readAiConfig();
  if (!isAiAvailable(config)) return;
  await syncProductEmbedding(id, buildEmbedSyncDeps(config));
}

export async function createProductAction(
  values: unknown,
): Promise<ProductActionResult<{ id: string }>> {
  const prepared = await prepare(values);
  if (!prepared.ok) return prepared;

  // The photos travel as their own ordered list: the first one is the main.
  const { photos, ...details } = prepared.input;

  let result;
  try {
    result = await createProductWithPhotos(details, photos);
  } catch (error) {
    console.error(error);
    return { ok: false, message: "Could not add the product. Try again." };
  }
  if (!result.ok) return refusal(result.reason);

  await indexProduct(result.id);
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

  const { photos, ...details } = prepared.input;

  let result;
  try {
    result = await updateProductWithPhotos(id, details, photos);
  } catch (error) {
    console.error(error);
    return { ok: false, message: "Could not save the product. Try again." };
  }
  if (!result.ok) return refusal(result.reason);

  // The photos that were taken off this product and that no product uses any
  // more (the database decides, and offers only files this form uploaded).
  // After the save, so a failed delete can never undo it.
  await deleteProductImages(result.unusedUrls);

  await indexProduct(id);
  refresh();
  return { ok: true };
}

// The "Rebuild search index" button: embeds every product whose stored
// embedding is missing or out of date, and skips the rest (so pressing it
// twice costs nothing the second time). Same checks as the save actions.
export async function rebuildSearchIndexAction(): Promise<
  { ok: true; message: string } | { ok: false; message: string }
> {
  if (!(await getCurrentUser())) {
    return { ok: false, message: MESSAGES.not_authenticated };
  }
  if (!(await getIsAdmin())) return { ok: false, message: MESSAGES.not_admin };

  const config = readAiConfig();
  if (!isAiAvailable(config)) {
    return { ok: false, message: "The AI assistant is switched off." };
  }

  try {
    const r = await rebuildSearchIndex(buildEmbedSyncDeps(config));
    const failed = r.failed > 0 ? ` ${r.failed} failed, press again.` : "";
    return {
      ok: r.failed === 0,
      message: `${r.updated} updated, ${r.unchanged} already up to date.${failed}`,
    };
  } catch (error) {
    console.error(error);
    return { ok: false, message: "Could not rebuild the index. Try again." };
  }
}
