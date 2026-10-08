// Browser only (uses canvas). Turns whatever the phone gives us (a 4000px
// 6 MB photo, a PNG, a WebP) into one JPEG of at most 1600px that fits the
// 2 MB bucket limit. JPEG, not WebP: Safari on iPhone cannot encode WebP
// from a canvas (it silently returns PNG), JPEG works everywhere.
// Throws Error with a message the owner can read.
import {
  PRODUCT_IMAGE_MAX_BYTES,
  PRODUCT_IMAGE_MAX_SIDE,
  PRODUCT_IMAGE_QUALITIES,
  fitWithin,
} from "@/lib/product-image";

const CANNOT_READ =
  "This photo could not be opened. Choose a JPG, PNG or WebP photo.";

type Decoded = {
  source: CanvasImageSource;
  width: number;
  height: number;
  close: () => void;
};

// createImageBitmap applies the phone's rotation flag (EXIF) for us. The
// <img> fallback is for older browsers.
async function decode(file: File): Promise<Decoded> {
  try {
    const bitmap = await createImageBitmap(file);
    return {
      source: bitmap,
      width: bitmap.width,
      height: bitmap.height,
      close: () => bitmap.close(),
    };
  } catch {
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      return {
        source: img,
        width: img.naturalWidth,
        height: img.naturalHeight,
        close: () => URL.revokeObjectURL(url),
      };
    } catch {
      URL.revokeObjectURL(url);
      throw new Error(CANNOT_READ);
    }
  }
}

function toJpeg(
  canvas: HTMLCanvasElement,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", quality),
  );
}

export async function resizeToJpeg(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/")) throw new Error(CANNOT_READ);

  const decoded = await decode(file);
  try {
    if (decoded.width < 1 || decoded.height < 1) throw new Error(CANNOT_READ);
    const { width, height } = fitWithin(
      decoded.width,
      decoded.height,
      PRODUCT_IMAGE_MAX_SIDE,
    );

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error(CANNOT_READ);
    // JPEG has no transparency: without this a transparent PNG goes black.
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(decoded.source, 0, 0, width, height);

    for (const quality of PRODUCT_IMAGE_QUALITIES) {
      const blob = await toJpeg(canvas, quality);
      if (
        blob &&
        blob.type === "image/jpeg" &&
        blob.size <= PRODUCT_IMAGE_MAX_BYTES
      ) {
        return blob;
      }
    }
    throw new Error(
      "This photo is too large even after shrinking. Try another one.",
    );
  } finally {
    decoded.close();
  }
}
