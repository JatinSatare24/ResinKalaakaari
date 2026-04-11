"use client"

import styles from '@/components/SortDropdown/SortDropdown.module.css'
import { useTransition } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

export default function SortDropdown() {

    const router = useRouter()
    const searchParams = useSearchParams()
    const [isPending, startTransition] = useTransition()

    const handleSort = (e: React.ChangeEvent<HTMLSelectElement>) => {

        const value = e.target.value
        const params = new URLSearchParams(searchParams.toString())

        if (value) {
            params.set('sort', value)
        } else {
            params.delete('sort')
        }

        startTransition(() => {
            router.push(`/products?${params.toString()}`)
        })

    }

    return (
        <select
            onChange={handleSort}
            className={styles.select}
            defaultValue={searchParams.get('sort') || ''}
        >
            <option value="">Sort by</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="newest">Newest</option>
        </select>
    )
}