// Pure helpers for product photos (no React, no Supabase, no browser APIs),
// so they can be tested on their own and used by both the browser (upload)
// and the server (delete the old photo).
import { PRODUCT_IMAGE_BUCKET } from "@/lib/constants";

export const PRODUCT_IMAGE_FOLDER = "products"; // admin uploads only ever go here
export const PRODUCT_IMAGE_MAX_SIDE = 1600; // px, longest side after resizing
export const PRODUCT_IMAGE_MAX_BYTES = 2 * 1024 * 1024; // = the bucket's file_size_limit
// Quality steps tried in order until the file fits under the size limit.
export const PRODUCT_IMAGE_QUALITIES = [0.85, 0.7, 0.55] as const;

// Scales a size down so the longest side is at most maxSide, keeping the
// shape. A smaller picture is never made bigger.
export function fitWithin(
  width: number,
  height: number,
  maxSide: number,
): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= maxSide) return { width, height };
  const scale = maxSide / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

// A new, random file name: products/<32 hex letters>.jpg. Random so two
// uploads never collide (we never overwrite a file) and the name tells
// nothing about the product. getRandomValues (not randomUUID) because
// randomUUID is missing on plain-http pages, e.g. testing from a phone on
// the local network.
export function newProductImagePath(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  const name = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(
    "",
  );
  return `${PRODUCT_IMAGE_FOLDER}/${name}.jpg`;
}

// All photos of a product in display order: the main photo first, then the
// extras by sort_order. Sorted here as well as in the query so the order never
// depends on how the database happens to return the rows. A link that appears
// twice (an extra equal to the main photo) is shown once.
export function buildPhotoList(
  main: string,
  extras: { image_url: string; sort_order: number }[],
): string[] {
  const photos = main ? [main] : [];
  const ordered = [...extras].sort((a, b) => a.sort_order - b.sort_order);
  for (const { image_url } of ordered) {
    if (image_url && !photos.includes(image_url)) photos.push(image_url);
  }
  return photos;
}

// From a public photo link back to its path inside the bucket
// ("products/abc.jpg"), or null when the link is not one of OUR uploads.
// The server uses it before deleting, so it can never be pointed at the
// hand-uploaded photos or at another bucket.
export function productImagePathFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const prefix = `/storage/v1/object/public/${encodeURIComponent(PRODUCT_IMAGE_BUCKET)}/`;
    if (parsed.protocol !== "https:" || !parsed.pathname.startsWith(prefix)) {
      return null;
    }
    const path = decodeURIComponent(parsed.pathname.slice(prefix.length));
    return new RegExp(`^${PRODUCT_IMAGE_FOLDER}/[^/]+$`).test(path)
      ? path
      : null;
  } catch {
    return null; // not a URL, or a broken %-escape
  }
}
