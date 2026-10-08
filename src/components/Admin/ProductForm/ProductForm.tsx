"use client";

// --- IMPORTS ---
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import {
  createProductAction,
  updateProductAction,
} from "@/app/admin/products/actions";
import PhotosField from "@/components/Admin/ProductForm/PhotosField";
import FormError from "@/components/FormError/FormError";
import { MAX_PRODUCT_DESCRIPTION_LENGTH } from "@/lib/constants";
import {
  charLength,
  validateProduct,
  type ProductField,
  type ProductFormErrors,
  type ProductFormValues,
} from "@/lib/product-admin";
import styles from "@/components/Admin/ProductForm/ProductForm.module.css";

// --- INTERFACES ---
export interface ProductFormProps {
  mode: "create" | "edit";
  productId?: string; // edit only
  initial: ProductFormValues;
  categories: { id: string; name: string }[];
  justAdded?: boolean; // show "Product added" (edit page, after a create)
}

// --- COMPONENT ---
// One form for both Add and Edit. The browser runs the same rules as the
// server for instant feedback; the Server Action runs them again.
export default function ProductForm({
  mode,
  productId,
  initial,
  categories,
  justAdded = false,
}: ProductFormProps) {
  const router = useRouter();
  const [values, setValues] = useState<ProductFormValues>(initial);
  const [errors, setErrors] = useState<ProductFormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(
    justAdded ? "Product added." : null,
  );
  const [isPending, startTransition] = useTransition();
  // The photo links the database has. Changes only after a successful save.
  const [savedPhotos, setSavedPhotos] = useState(initial.photos);
  const [photoBusy, setPhotoBusy] = useState(false);

  // Changes one field and clears that field's old error message.
  function setField<K extends keyof ProductFormValues>(
    key: K,
    value: ProductFormValues[K],
  ) {
    setValues((current) => ({ ...current, [key]: value }));
    setSaved(null);
    if (key in errors) {
      setErrors((current) => ({
        ...current,
        [key as ProductField]: undefined,
      }));
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaved(null);
    setFormError(null);

    const check = validateProduct({
      ...values,
      name: values.name.trim(),
      description: values.description.trim(),
      price: values.price.trim(),
    });
    if (!check.ok) {
      setErrors(check.errors);
      setFormError("Some fields need a change. See the red messages.");
      return;
    }
    setErrors({});

    startTransition(async () => {
      if (mode === "create") {
        const result = await createProductAction(values);
        if (!result.ok) {
          setErrors(result.errors ?? {});
          setFormError(result.message);
          return;
        }
        // Open the new product so the owner can see it saved.
        router.push(`/admin/products/${result.id}/edit?added=1`);
        return;
      }

      const result = await updateProductAction(productId, values);
      if (!result.ok) {
        setErrors(result.errors ?? {});
        setFormError(result.message);
        return;
      }
      setSavedPhotos(values.photos);
      setSaved("Saved.");
    });
  }

  const descriptionLength = charLength(values.description);

  // A field's input points at its message so screen readers read both.
  const describe = (field: ProductField) =>
    errors[field] ? `${field}-error` : undefined;

  return (
    <form onSubmit={handleSubmit} className={styles.form} noValidate>
      <div className={styles.field}>
        <label htmlFor="name" className={styles.label}>
          Product name
        </label>
        <input
          id="name"
          type="text"
          value={values.name}
          onChange={(e) => setField("name", e.target.value)}
          className={styles.input}
          autoComplete="off"
          aria-invalid={errors.name ? true : undefined}
          aria-describedby={describe("name")}
          disabled={isPending}
        />
        {errors.name && <FormError id="name-error">{errors.name}</FormError>}
      </div>

      <div className={styles.field}>
        <label htmlFor="price" className={styles.label}>
          Price in rupees (₹)
        </label>
        <input
          id="price"
          type="text"
          inputMode="numeric"
          value={values.price}
          onChange={(e) => setField("price", e.target.value)}
          className={styles.input}
          placeholder="For example: 450"
          autoComplete="off"
          aria-invalid={errors.price ? true : undefined}
          aria-describedby={describe("price")}
          disabled={isPending}
        />
        {errors.price && <FormError id="price-error">{errors.price}</FormError>}
      </div>

      <div className={styles.field}>
        <label htmlFor="category" className={styles.label}>
          Category
        </label>
        <select
          id="category"
          value={values.category_id}
          onChange={(e) => setField("category_id", e.target.value)}
          className={styles.input}
          aria-invalid={errors.category_id ? true : undefined}
          aria-describedby={describe("category_id")}
          disabled={isPending}
        >
          <option value="">Choose a category</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        {errors.category_id && (
          <FormError id="category_id-error">{errors.category_id}</FormError>
        )}
      </div>

      <div className={styles.field}>
        <label htmlFor="description" className={styles.label}>
          Description
        </label>
        <textarea
          id="description"
          value={values.description}
          onChange={(e) => setField("description", e.target.value)}
          className={`${styles.input} ${styles.textarea}`}
          rows={8}
          aria-invalid={errors.description ? true : undefined}
          aria-describedby={`description-count${errors.description ? " description-error" : ""}`}
          disabled={isPending}
        />
        <p
          id="description-count"
          className={
            descriptionLength > MAX_PRODUCT_DESCRIPTION_LENGTH
              ? styles.countOver
              : styles.count
          }
        >
          {descriptionLength} / {MAX_PRODUCT_DESCRIPTION_LENGTH}
        </p>
        {errors.description && (
          <FormError id="description-error">{errors.description}</FormError>
        )}
      </div>

      <PhotosField
        photos={values.photos}
        savedPhotos={savedPhotos}
        error={errors.photos}
        disabled={isPending}
        onChange={(photos) => setField("photos", photos)}
        onBusyChange={setPhotoBusy}
      />

      <fieldset className={styles.switches}>
        <legend className={styles.label}>Where it shows</legend>
        <label className={styles.switch}>
          <input
            type="checkbox"
            checked={values.is_featured}
            onChange={(e) => setField("is_featured", e.target.checked)}
            disabled={isPending}
          />
          <span>Featured on the home page</span>
        </label>
        <label className={styles.switch}>
          <input
            type="checkbox"
            checked={values.is_gallery}
            onChange={(e) => setField("is_gallery", e.target.checked)}
            disabled={isPending}
          />
          <span>Show in the gallery</span>
        </label>
      </fieldset>

      {formError && <FormError>{formError}</FormError>}
      {saved && (
        <p role="status" className={styles.saved}>
          {saved}
        </p>
      )}

      <button
        type="submit"
        className={styles.submit}
        disabled={isPending || photoBusy}
      >
        {isPending
          ? "Saving..."
          : mode === "create"
            ? "Add product"
            : "Save changes"}
      </button>
    </form>
  );
}
