"use client";

// --- IMPORTS ---
import { useState, useTransition, type FormEvent } from "react";
import { renameCategoryAction } from "@/app/admin/categories/actions";
import FormError from "@/components/FormError/FormError";
import { checkCategoryName } from "@/lib/product-admin";
import type { AdminCategory } from "@/lib/types";
import styles from "@/components/Admin/Categories/Categories.module.css";

// --- INTERFACES ---
export interface CategoryRowProps {
  category: AdminCategory;
}

// --- COMPONENT ---
// Shows the name with a Rename button; Rename swaps it for a small form.
// Only the name changes, never the link (slug), so shop links keep working.
export default function CategoryRow({ category }: CategoryRowProps) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(category.name);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const errorId = `rename-error-${category.id}`;

  function cancel() {
    setEditing(false);
    setName(category.name);
    setError(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const check = checkCategoryName(name);
    if (!check.ok) {
      setError(check.error);
      return;
    }
    // Nothing changed: just close.
    if (check.name === category.name) {
      cancel();
      return;
    }
    setError(null);

    startTransition(async () => {
      const result = await renameCategoryAction(category.id, check.name);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setEditing(false); // the page re-renders with the new name
    });
  }

  const productsText = `${category.product_count} ${
    category.product_count === 1 ? "product" : "products"
  }`;

  if (!editing) {
    return (
      <li className={styles.row}>
        <div className={styles.rowInfo}>
          <p className={styles.rowName}>{category.name}</p>
          <p className={styles.rowMeta}>{productsText}</p>
        </div>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={() => setEditing(true)}
          aria-label={`Rename ${category.name}`}
        >
          Rename
        </button>
      </li>
    );
  }

  return (
    <li className={styles.row}>
      <form onSubmit={handleSubmit} className={styles.renameForm} noValidate>
        <label htmlFor={`rename-${category.id}`} className="sr-only">
          New name for {category.name}
        </label>
        <input
          id={`rename-${category.id}`}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={styles.input}
          autoComplete="off"
          autoFocus
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          disabled={isPending}
        />
        <div className={styles.renameButtons}>
          <button type="submit" className={styles.button} disabled={isPending}>
            {isPending ? "Saving..." : "Save"}
          </button>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={cancel}
            disabled={isPending}
          >
            Cancel
          </button>
        </div>
        {error && <FormError id={errorId}>{error}</FormError>}
      </form>
    </li>
  );
}
