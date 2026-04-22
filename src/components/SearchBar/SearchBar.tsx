'use client';

/**
 * SEARCH BAR COMPONENT
 * Handles debounced product searching and updates URL parameters.
 * Wrapped in <Suspense> to prevent Next.js CSR Bailout during static builds.
 */

// --- IMPORTS ---
import React, { useState, useTransition, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDebouncedCallback } from 'use-debounce';
import styles from './SearchBar.module.css';

// --- INTERFACES ---
export interface SearchBarProps {
  // Interface established for future scalability
}

// --- INTERNAL COMPONENT (Handles the hooks) ---
function SearchBarContent(props: SearchBarProps) {
  // --- STATE & ROUTING ---
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Local state initialized from URL params to ensure persistence on reload
  const [search, setSearch] = useState<string>(searchParams.get('search') || '');

  // --- SEARCH LOGIC (DEBOUNCED) ---
  const debouncedSearch = useDebouncedCallback((value: string) => {
    const params = new URLSearchParams(searchParams.toString());

    if (value.trim()) {
      params.set('search', value.trim());
    } else {
      params.delete('search');
    }

    // Using startTransition to keep the UI responsive while navigation occurs
    startTransition(() => {
      router.push(`/products?${params.toString()}`);
    });
  }, 400);

  // --- HANDLERS ---
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setSearch(value);
    debouncedSearch(value);
  }

  // --- RENDER ---
  return (
    <div className={styles.wrapper} role="search">

      {/* --- SEARCH INPUT --- */}
      <input
        id="product-search"
        type="text"
        value={search}
        onChange={handleChange}
        placeholder="Search products..."
        className={`${styles.input} ${isPending ? styles.inputPending : ''}`}
        aria-label="Search for resin art products"
        aria-busy={isPending}
        autoComplete="off"
      />

      {/* --- STATUS INDICATOR --- */}
      {/* a11y: aria-live ensures screen readers announce the search status */}
      <div aria-live="polite" aria-atomic="true" className={styles.statusContainer}>
        {isPending && (
          <span className={styles.status}>Searching...</span>
        )}
      </div>

    </div>
  );
}

// --- MAIN EXPORT (The Suspense Boundary) ---
export default function SearchBar(props: SearchBarProps) {
  return (
    // Fallback UI shown strictly during the server-side static build process
    <Suspense
      fallback={
        <div className={styles.wrapper}>
          <input
            type="text"
            placeholder="Loading search..."
            className={styles.input}
            disabled
          />
        </div>
      }
    >
      <SearchBarContent {...props} />
    </Suspense>
  );
}