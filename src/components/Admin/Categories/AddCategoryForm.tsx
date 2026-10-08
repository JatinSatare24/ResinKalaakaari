"use client";

// --- IMPORTS ---
import { useState, useTransition, type FormEvent } from "react";
import { addCategory } from "@/app/admin/categories/actions";
import FormError from "@/components/FormError/FormError";
import { checkCategoryName } from "@/lib/product-admin";
import styles from "@/components/Admin/Categories/Categories.module.css";

// --- COMPONENT ---
// One box and one button. The browser runs the same name rules as the server
// for instant feedback; the server action runs them again.
export default function AddCategoryForm() {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaved(null);

    const check = checkCategoryName(name);
    if (!check.ok) {
      setError(check.error);
      return;
    }
    setError(null);

    startTransition(async () => {
      const result = await addCategory(check.name);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setSaved(`Added "${check.name}".`);
      setName(""); // ready for the next one
    });
  }

  return (
    <form onSubmit={handleSubmit} className={styles.addForm} noValidate>
      <label htmlFor="new-category" className={styles.label}>
        New category
      </label>
      <div className={styles.addRow}>
        <input
          id="new-category"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={styles.input}
          placeholder="For example: Coasters"
          autoComplete="off"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "new-category-error" : undefined}
          disabled={isPending}
        />
        <button type="submit" className={styles.button} disabled={isPending}>
          {isPending ? "Adding..." : "Add"}
        </button>
      </div>
      {error && <FormError id="new-category-error">{error}</FormError>}
      {saved && (
        <p role="status" className={styles.saved}>
          {saved}
        </p>
      )}
    </form>
  );
}
