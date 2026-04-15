'use client'

import Link from 'next/link'
import styles from '@/components/Navbar/Navbar.module.css'
import { useState, useEffect, useContext } from 'react'
import { FiMenu, FiShoppingCart, FiUser, FiLogOut } from "react-icons/fi"; // Added FiLogOut
import { CartContext } from '@/context/CartContext';
import Image from 'next/image';
import { client } from '@/lib/supabase'; // Import your unified client
import { useRouter } from 'next/navigation';

export default function Navbar() {
    const [open, setOpen] = useState(false)
    const [user, setUser] = useState<any>(null); // State to track the user
    const { cart } = useContext(CartContext)!
    const supabase = client();
    const router = useRouter();

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
    }, []);

    // 2. Logout function
    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/'); // Send to home after logout
        router.refresh(); // Refresh to clear any server-side state
    };

    // Lock scroll logic
    useEffect(() => {
        document.body.style.overflow = open ? "hidden" : "auto";
        return () => { document.body.style.overflow = "auto"; };
    }, [open]);

    return (
        <nav className={`${styles.nav}`}>
            {/* Left: Hamburger */}
            <button onClick={() => setOpen(!open)} className={styles.menuBtn}>
                <FiMenu size={22} />
            </button>

            {/* Center: Logo */}
            <Link href='/' className={styles.logo}>
                <Image
                    src='/Logo/logo.png'
                    alt='Resin Kalaakaari logo'
                    width={110}
                    height={60}
                    className={styles.image}
                    priority // Added priority for logo
                />
            </Link>

            {/* Right: Cart & User */}
            <div className={styles.rightIcons}>

                {/* Visual Feedback Logic */}
                {user ? (
                    <div className={styles.userSection}>
                        <button onClick={handleLogout} className={styles.iconBtn} title="Logout">
                            {user.user_metadata?.avatar_url ? (
                                <img
                                    src={user.user_metadata.avatar_url}
                                    className={styles.avatar}
                                    alt="User profile"
                                />
                            ) : (
                                <FiUser className={styles.FiUser} />
                            )}
                            <span className={styles.logoutTooltip}><FiLogOut size={12} /> Logout</span>
                        </button>
                    </div>
                ) : (
                    <Link href='/login' className={styles.cartLink}>
                        <FiUser className={styles.FiUser} />
                    </Link>
                )}

                <Link href="/cart" className={styles.cartLink}>
                    <FiShoppingCart className={styles.FiShoppingCart} />
                    {totalItems > 0 && (
                        <span className={styles.badge}>{totalItems}</span>
                    )}
                </Link>
            </div>

            {/* Mobile menu hamburger */}
            {open && (
                <div className={styles.menu}>
                    <div className={styles.menuHeader}>
                        <span className={styles.menuTitle}>Menu</span>
                        <button onClick={() => setOpen(false)} className={styles.close}>✕</button>
                    </div>

                    <nav className={styles.menuLinks}>
                        <Link href="/products" onClick={() => setOpen(false)}>Products</Link>
                        <Link href="/cart" onClick={() => setOpen(false)}>Cart</Link>
                        {/* Mobile Logout option */}
                        {user && <button onClick={handleLogout} className={styles.mobileLogout}>Logout</button>}
                    </nav>
                </div>
            )}
        </nav >
    )
}