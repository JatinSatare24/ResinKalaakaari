'use client'

import Link from 'next/link'
import styles from '@/components/Navbar/Navbar.module.css'
import { useState, useEffect, useContext, useRef } from 'react'
import { FiMenu, FiShoppingCart, FiUser, FiLogOut, FiPackage, FiSettings } from "react-icons/fi";
import { CartContext } from '@/context/CartContext';
import Image from 'next/image';
import { client } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function Navbar() {
    const [open, setOpen] = useState(false)
    const [dropdownOpen, setDropdownOpen] = useState(false) // NEW: State for dropdown
    const [user, setUser] = useState<any>(null);
    const { cart } = useContext(CartContext)!
    const supabase = client();
    const router = useRouter();
    const dropdownRef = useRef<HTMLDivElement>(null); // NEW: To detect clicks outside

    const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0)

    // 1. Fetch user and listen for changes
    useEffect(() => {
        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
        };
        checkUser();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });

        return () => subscription.unsubscribe();
    }, [supabase]);

    // 2. NEW: Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        setDropdownOpen(false);
        router.push('/');
        router.refresh();
    };

    return (
        <nav className={styles.nav}>
            <button onClick={() => setOpen(!open)} className={styles.menuBtn}>
                <FiMenu size={22} />
            </button>

            <Link href='/' className={styles.logo}>
                <Image src='/Logo/logo.png' alt='Resin Kalaakaari logo' width={110} height={60} priority />
            </Link>

            <div className={styles.rightIcons}>
                {user ? (
                    <div className={styles.userSection} ref={dropdownRef}>
                        {/* 3. Toggles the dropdown instead of logging out */}
                        <button
                            onClick={() => setDropdownOpen(!dropdownOpen)}
                            className={styles.iconBtn}
                            title={user.user_metadata?.full_name || 'User Menu'}
                        >
                            {/* Check for both avatar_url OR picture */}
                            {(user.user_metadata?.avatar_url || user.user_metadata?.picture) ? (
                                <img
                                    src={user.user_metadata.avatar_url || user.user_metadata.picture}
                                    className={styles.avatar}
                                    alt="User Profile"
                                    referrerPolicy="no-referrer" // CRITICAL for Google images
                                />
                            ) : (
                                <FiUser className={styles.FiUser} />
                            )}
                        </button>

                        {/* 4. The actual Dropdown Menu */}
                        {dropdownOpen && (
                            <div className={styles.dropdown}>
                                <div className={styles.dropdownHeader}>
                                    <p className={styles.userName}>{user.user_metadata?.full_name || 'Art Lover'}</p>
                                    <p className={styles.userEmail}>{user.email}</p>
                                </div>
                                <hr />
                                <Link href="/profile" onClick={() => setDropdownOpen(false)} className={styles.dropdownItem}>
                                    <FiUser /> Profile
                                </Link>
                                <Link href="/my-orders" onClick={() => setDropdownOpen(false)} className={styles.dropdownItem}>
                                    <FiPackage /> My Orders
                                </Link>
                                <hr />
                                <button onClick={handleLogout} className={styles.logoutBtn}>
                                    <FiLogOut /> Logout
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <Link href='/login' className={styles.cartLink}>
                        <FiUser className={styles.FiUser} />
                    </Link>
                )}

                <Link href="/cart" className={styles.cartLink}>
                    <FiShoppingCart className={styles.FiShoppingCart} />
                    {totalItems > 0 && <span className={styles.badge}>{totalItems}</span>}
                </Link>
            </div>

            {/* ... Mobile Menu remains here ... */}
            <div className={`${styles.mobileMenu} ${open ? styles.active : ''}`}>
                <Link href="/products" onClick={() => setOpen(false)}>Products</Link>
                <Link href="/about" onClick={() => setOpen(false)}>About Us</Link>
                <Link href="/contact" onClick={() => setOpen(false)}>Contact</Link>
            </div>

            {/* Background Dimming when Mobile Menu is Open */}
            {open && <div className={styles.overlay} onClick={() => setOpen(false)}></div>}
        </nav>
    )
}