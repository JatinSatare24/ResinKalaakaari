// Deletes a product photo from the bucket. Server only. Best effort: the
// product is already saved, so a failed delete just leaves one unused file
// behind; it must never turn a successful save into an error.
// Two safety checks before anything is removed: the link must be one of the
// admin's own uploads (products/<file>), and the database already said the
// photo is no longer used by any product.
import { createServerSupabaseClient } from "@/lib/server";
import { PRODUCT_IMAGE_BUCKET } from "@/lib/constants";
import { productImagePathFromUrl } from "@/lib/product-image";

export async function deleteProductImage(url: string | null): Promise<void> {
  if (!url) return;
  const path = productImagePathFromUrl(url);
  if (!path) return;

  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.storage
      .from(PRODUCT_IMAGE_BUCKET)
      .remove([path]);
    if (error) console.error(`deleteProductImage failed: ${error.message}`);
  } catch (error) {
    console.error(error);
  }
}
