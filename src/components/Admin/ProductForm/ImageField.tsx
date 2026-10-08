"use client";

// --- IMPORTS ---
import Image from "next/image";
import { useRef, useState, type ChangeEvent } from "react";
import FormError from "@/components/FormError/FormError";
import { PRODUCT_IMAGE_BUCKET } from "@/lib/constants";
import {
  newProductImagePath,
  productImagePathFromUrl,
} from "@/lib/product-image";
import { resizeToJpeg } from "@/lib/resize-image";
import { client } from "@/lib/supabase";
import styles from "@/components/Admin/ProductForm/ProductForm.module.css";

// --- INTERFACES ---
export interface ImageFieldProps {
  value: string; // the photo link in the form right now ("" = none)
  savedValue: string; // the photo link the database has (never deleted from here)
  error?: string;
  disabled?: boolean;
  onChange: (url: string) => void;
  onBusyChange: (busy: boolean) => void; // the form blocks Save while true
}

type Status = "idle" | "preparing" | "uploading";

// --- COMPONENT ---
// Pick -> shrink in the browser -> upload straight to the storage bucket ->
// hand the public link to the form. The file never passes through our
// server, so the server never has to hold a big upload. The form saves only
// the LINK, together with the rest of the product.
export default function ImageField({
  value,
  savedValue,
  error,
  disabled = false,
  onChange,
  onBusyChange,
}: ImageFieldProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [problem, setProblem] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const busy = status !== "idle";

  function setBusy(next: Status) {
    setStatus(next);
    onBusyChange(next !== "idle");
  }

  async function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Reset so choosing the same file again still fires onChange.
    event.target.value = "";
    if (!file) return;

    setProblem(null);
    try {
      setBusy("preparing");
      const jpeg = await resizeToJpeg(file);

      setBusy("uploading");
      const supabase = client();
      const path = newProductImagePath();
      const { error: uploadError } = await supabase.storage
        .from(PRODUCT_IMAGE_BUCKET)
        .upload(path, jpeg, {
          contentType: "image/jpeg",
          cacheControl: "31536000", // a file's name never gets reused, so cache for a year
          upsert: false, // never overwrite
        });
      if (uploadError) {
        console.error(uploadError);
        throw new Error(
          "The photo could not be uploaded. Check your internet and try again.",
        );
      }
      const { data } = supabase.storage
        .from(PRODUCT_IMAGE_BUCKET)
        .getPublicUrl(path);

      // The photo chosen earlier in this same form but never saved is now
      // unused: remove it so test picks don't pile up. A saved photo is left
      // alone (the server cleans that one up when the product is saved).
      const previousPath =
        value && value !== savedValue ? productImagePathFromUrl(value) : null;
      if (previousPath) {
        void supabase.storage.from(PRODUCT_IMAGE_BUCKET).remove([previousPath]);
      }

      onChange(data.publicUrl);
    } catch (caught) {
      setProblem(
        caught instanceof Error
          ? caught.message
          : "Something went wrong with that photo.",
      );
    } finally {
      setBusy("idle");
    }
  }

  const message = problem ?? error;

  return (
    <div className={styles.field}>
      <span className={styles.label} id="photo-label">
        Photo
      </span>

      {value && (
        <Image
          src={value}
          alt="Product photo"
          width={160}
          height={160}
          className={styles.preview}
        />
      )}

      <input
        ref={inputRef}
        id="photo"
        type="file"
        accept="image/*"
        onChange={handleChange}
        className="sr-only"
        aria-labelledby="photo-label"
        aria-describedby={message ? "photo-error" : undefined}
        disabled={disabled || busy}
        tabIndex={-1}
      />
      <button
        type="button"
        className={styles.photoButton}
        onClick={() => inputRef.current?.click()}
        disabled={disabled || busy}
        aria-describedby={message ? "photo-error" : undefined}
      >
        {status === "preparing"
          ? "Preparing photo..."
          : status === "uploading"
            ? "Uploading..."
            : value
              ? "Change photo"
              : "Choose photo"}
      </button>

      {message && <FormError id="photo-error">{message}</FormError>}
    </div>
  );
}
