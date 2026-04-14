'use client'

import Link from 'next/link'
import styles from '@/components/Navbar/Navbar.module.css'
import { useState, useEffect } from 'react'
import { FiMenu, FiShoppingCart, FiUser } from "react-icons/fi";
import { useContext } from 'react';
import { CartContext } from '@/context/CartContext';
import Image from 'next/image';


export default function Navbar() {

    const [open, setOpen] = useState(false)

    const { cart } = useContext(CartContext)!

    const totalItems = cart.reduce((acc, item) => {
        return acc + item.quantity
    }, 0)

    // Lock scroll

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
                    <FiMenu size={22} />
                </button>
   


            {/* Center: Logo */}
        
                <Link href='/' className={styles.logo}>
                    <Image
                        src='/Logo/logo.png'
                        alt='Resin Kalaakaari logo'
                        width={130}
                        height={70}
                        className={styles.image}
                    />
                </Link>
           


            {/* Desktop Links */}

            {/* <div className={styles.desktopLinks}>
                <Link href="/products" >Products</Link>
                <Link href="/cart">Cart</Link>
            </div> */}

            {/* right: Cart */}

            <div className={`${styles.links} ${styles.cart}`}>

                <Link href='/login' className={styles.cartLink}>
                    <FiUser size={24} />
                </Link>

                <Link href="/cart" className={styles.cartLink}>
                    <FiShoppingCart size={22} />
                    {totalItems > 0 && (
                        <span className={styles.badge}>{totalItems}</span>
                    )}
                </Link>


            </div>

            {/* Mobile menu hamburger */}
            {
                open && (
                    <div className={styles.menu}>
                        <div className={styles.menuHeader}>
                            <span className={styles.menuTitle}>Menu</span>
                            <button onClick={() => setOpen(false)} className={styles.close}>✕</button>
                        </div>

                        <nav className={styles.menuLinks}>
                            <Link href="/products" onClick={() => setOpen(false)}>Products</Link>
                            <Link href="/cart" onClick={() => setOpen(false)}>Cart</Link>
                        </nav>
                    </div>
                )
            }

        </nav >
    )
}