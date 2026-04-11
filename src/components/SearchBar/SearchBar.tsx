'use client';

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDebouncedCallback } from 'use-debounce';
import styles from './SearchBar.module.css';

export default function SearchBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(searchParams.get('search') || '');

  const debouncedSearch = useDebouncedCallback((value: string) => {
    const params = new URLSearchParams(searchParams.toString());

    if (value.trim()) {
      params.set('search', value.trim());
    } else {
      params.delete('search');
    }

    startTransition(() => {
      router.push(`/products?${params.toString()}`);
    });
  }, 400);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setSearch(value);
    debouncedSearch(value);
  }

  return (
    <div className={styles.wrapper}>
      <input
        value={search}
        onChange={handleChange}
        placeholder="Search products..."
        className={`${styles.input} ${isPending ? styles.inputPending : ''}`}
      />
      {isPending && (
        <span className={styles.status}>Searching...</span>
      )}
    </div>
  );
}