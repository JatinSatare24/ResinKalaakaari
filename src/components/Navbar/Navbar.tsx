'use client'

import Link from 'next/link'
import styles from '@/components/Navbar/Navbar.module.css'
import { useState, useEffect } from 'react'
import { FiMenu, FiShoppingCart } from "react-icons/fi";


export default function Navbar() {

    const [open, setOpen] = useState(false)

    useEffect(() => {
        if (open) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "auto";
        }

        return () => {
            document.body.style.overflow = "auto";
        };
    }, [open]);

    return (
        // Navbar
        <nav className={`${styles.nav} ${styles.links}`}>
            {/* Left: Hamburger */}
            <button onClick={() => setOpen(!open)} className={styles.menuBtn}>
                <FiMenu size={20} />
            </button>

            {/* Center: Logo */}
            <Link href='/' className={styles.logo}>
                <h2>Resin Kalaakari</h2>
            </Link>

            {/* Desktop Links */}

            <div className={styles.desktopLinks}>
                <Link href="/products">Products</Link>
                <Link href="/cart">Cart</Link>
            </div>

            {/* right: Cart */}

            <div className={`${styles.links} ${styles.cart}`}>
                <Link href='/cart'>
                    <FiShoppingCart size={20} />
                </Link>
            </div>

            {/* Mobile menu hamburger */}
            {open &&
                (<div className={styles.menu}>
                    <button onClick={() => setOpen(false)} className={styles.close}>✕</button>
                    <Link href="/products">Products</Link>
                    <Link href="/cart">Cart</Link>
                </div>)
            }

        </nav>
    )
}