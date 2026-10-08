"use client"; // needs a click handler and a pending state

import { useState, useTransition } from "react";
import { rebuildSearchIndexAction } from "@/app/admin/products/actions";
import styles from "@/components/Admin/Products/Products.module.css";

// Rebuilds the AI assistant's product search index. Shown only while the
// assistant is on. The result is announced to screen readers (role="status").
export default function RebuildIndexButton() {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(
    null,
  );

  function rebuild() {
    setResult(null);
    startTransition(async () => {
      try {
        setResult(await rebuildSearchIndexAction());
      } catch {
        setResult({ ok: false, message: "Could not rebuild. Try again." });
      }
    });
  }

  return (
    <div className={styles.indexRow}>
      <button
        type="button"
        className={styles.indexButton}
        onClick={rebuild}
        disabled={isPending}
      >
        {isPending ? "Rebuilding…" : "Rebuild search index"}
      </button>
      <span className={styles.indexHelp}>
        Updates the AI assistant&apos;s product search. Only changed products
        are processed.
      </span>
      <p
        role="status"
        className={result?.ok === false ? styles.indexError : styles.indexOk}
      >
        {result?.message}
      </p>
    </div>
  );
}
