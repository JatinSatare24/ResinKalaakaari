// Browser only (canvas + the admin's own session). The two storage jobs the
// photo list needs: put a new photo in the bucket, and take back one that was
// uploaded in the form but never saved. Neither touches our server: the file
// goes straight from the phone to storage, and the storage policies (admins
// only, products/ folder only, 2 MB) are the lock.
import { PRODUCT_IMAGE_BUCKET } from "@/lib/constants";
import {
  newProductImagePath,
  productImagePathFromUrl,
} from "@/lib/product-image";
import { resizeToJpeg } from "@/lib/resize-image";
import { client } from "@/lib/supabase";

export type UploadStage = "preparing" | "uploading";

// Shrink in the browser, upload as products/<random>.jpg, return the public
// link. Throws an Error whose message the owner can read.
export async function uploadProductPhoto(
  file: File,
  onStage?: (stage: UploadStage) => void,
): Promise<string> {
  onStage?.("preparing");
  const jpeg = await resizeToJpeg(file);

  onStage?.("uploading");
  const supabase = client();
  const path = newProductImagePath();
  const { error } = await supabase.storage
    .from(PRODUCT_IMAGE_BUCKET)
    .upload(path, jpeg, {
      contentType: "image/jpeg",
      cacheControl: "31536000", // a file's name never gets reused, so cache for a year
      upsert: false, // never overwrite
    });
  if (error) {
    console.error(error);
    throw new Error(
      "The photo could not be uploaded. Check your internet and try again.",
    );
  }
  return supabase.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(path).data
    .publicUrl;
}

// Removes a photo that was uploaded in this form and then taken off the list
// before saving, so test picks do not pile up in the bucket. Best effort: a
// failure leaves one unused file and nothing else. A link that is not one of
// our own uploads is ignored.
export async function discardUploadedPhoto(url: string): Promise<void> {
  const path = productImagePathFromUrl(url);
  if (!path) return;
  try {
    const { error } = await client()
      .storage.from(PRODUCT_IMAGE_BUCKET)
      .remove([path]);
    if (error) console.error(`discardUploadedPhoto failed: ${error.message}`);
  } catch (error) {
    console.error(error);
  }
}
