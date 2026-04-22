"use client"

/**
 * SORT DROPDOWN COMPONENT
 * Handles product sorting and updates URL parameters.
 * Wrapped in <Suspense> to prevent Next.js CSR Bailout during static builds.
 */

// --- IMPORTS ---
import React, { useTransition, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import styles from '@/components/SortDropdown/SortDropdown.module.css'

// --- INTERFACES ---
export interface SortDropdownProps {
    // Interface established for future scalability (e.g., dynamic sort options)
}

// --- INTERNAL COMPONENT (Handles the hooks) ---
function SortDropdownContent(props: SortDropdownProps) {
    // --- STATE & ROUTING ---
    const router = useRouter()
    const searchParams = useSearchParams()
    const [isPending, startTransition] = useTransition()

    // --- HANDLERS ---
    const handleSort = (e: React.ChangeEvent<HTMLSelectElement>) => {
        try {
            const value = e.target.value
            const params = new URLSearchParams(searchParams.toString())

            if (value) {
                params.set('sort', value)
            } else {
                params.delete('sort')
            }

            // Using startTransition to keep the UI responsive during route change
            startTransition(() => {
                router.push(`/products?${params.toString()}`)
            })
        } catch (err: unknown) {
            console.error("Failed to update sort parameters:", err)
        }
    }

    // --- RENDER ---
    return (
        <div className={styles.sortWrapper}>
            <select
                id="product-sort"
                onChange={handleSort}
                className={styles.select}
                defaultValue={searchParams.get('sort') || ''}
                aria-label="Sort products by price or date"
                aria-busy={isPending}
            >
                <option value="">Sort by</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="newest">Newest</option>
            </select>
        </div>
    )
}

// --- MAIN EXPORT (The Suspense Boundary) ---
export default function SortDropdown(props: SortDropdownProps) {
    return (
        // Fallback UI shown strictly during the server-side static build process
        <Suspense
            fallback={
                <div className={styles.sortWrapper}>
                    <select className={styles.select} disabled aria-label="Loading sort options">
                        <option>Sort by...</option>
                    </select>
                </div>
            }
        >
            <SortDropdownContent {...props} />
        </Suspense>
    )
}