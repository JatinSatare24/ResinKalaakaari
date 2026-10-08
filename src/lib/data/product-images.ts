// Deletes product photos from the bucket. Server only. Best effort: the
// product is already saved, so a failed delete just leaves unused files
// behind; it must never turn a successful save into an error.
// Two safety checks before anything is removed: every link must be one of the
// admin's own uploads (products/<file>), and the database already said the
// photos are no longer used by any product.
import { createServerSupabaseClient } from "@/lib/server";
import { PRODUCT_IMAGE_BUCKET } from "@/lib/constants";
import { productImagePathFromUrl } from "@/lib/product-image";

// Several photos in ONE storage call (a save can drop more than one).
export async function deleteProductImages(urls: string[]): Promise<void> {
  // Links that are not ours become null and are skipped; a Set removes
  // duplicates so one file is never asked for twice.
  const paths = new Set<string>();
  for (const url of urls) {
    const path = productImagePathFromUrl(url);
    if (path) paths.add(path);
  }
  if (paths.size === 0) return;

  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.storage
      .from(PRODUCT_IMAGE_BUCKET)
      .remove([...paths]);
    if (error) console.error(`deleteProductImages failed: ${error.message}`);
  } catch (error) {
    console.error(error);
  }
}
