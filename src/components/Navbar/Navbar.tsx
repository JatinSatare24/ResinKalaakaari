"use client";

// --- IMPORTS ---
import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  FiGrid,
  FiMenu,
  FiShoppingCart,
  FiUser,
  FiLogOut,
  FiPackage,
} from "react-icons/fi";
import { client } from "@/lib/supabase";
import { useCart } from "@/context/CartContext";
import { isAdmin } from "@/lib/data/admin";
import styles from "@/components/Navbar/Navbar.module.css";

// --- COMPONENT ---
export default function Navbar() {
  // --- STATE & REFS ---
  const [open, setOpen] = useState<boolean>(false);
  const [dropdownOpen, setDropdownOpen] = useState<boolean>(false); // State for dropdown
  const dropdownRef = useRef<HTMLDivElement>(null); // To detect clicks outside

  // --- CONTEXT & UTILS ---
  // The signed-in user comes from the cart provider, which already listens
  // to auth changes. (The Navbar used to run its own copy of that listener.)
  const { cart, user } = useCart();
  const router = useRouter();

  // Is the signed-in user an admin? Only used to SHOW a link; the admin pages
  // check the role again on the server. The answer is stored together with
  // the user id it belongs to, so after sign-out or a different login the old
  // answer is ignored without any reset code.
  const [adminCheck, setAdminCheck] = useState<{
    userId: string;
    isAdmin: boolean;
  } | null>(null);
  const userId = user?.id;
  const showAdminLink =
    adminCheck !== null && adminCheck.userId === userId && adminCheck.isAdmin;

  // Derived state
  const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);

  // --- LIFECYCLE ---
  // Close the dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false; // drop the answer if the user changed meanwhile
    isAdmin(client())
      .then((result) => {
        if (!cancelled) setAdminCheck({ userId, isAdmin: result });
      })
      .catch(() => {
        // Fail closed: no link. (A guess is never shown as "admin".)
        if (!cancelled) setAdminCheck({ userId, isAdmin: false });
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // --- HANDLERS ---
  const handleLogout = async () => {
    try {
      // client() returns the same browser client every time.
      const { error } = await client().auth.signOut();
      if (error) throw error;
    } catch (err: unknown) {
      console.error("Failed to sign out:", err);
    } finally {
      setDropdownOpen(false);
      router.push("/");
      router.refresh();
    }
  };

  // --- RENDER ---
  return (
    <nav className={styles.nav} aria-label="Main Navigation">
      {/* --- MOBILE MENU TOGGLE --- */}
      <button
        onClick={() => setOpen(!open)}
        className={styles.menuBtn}
        aria-expanded={open}
        aria-controls="mobile-menu"
        aria-label={open ? "Close navigation menu" : "Open navigation menu"}
      >
        <FiMenu size={22} aria-hidden="true" />
      </button>

      {/* --- BRAND LOGO --- */}
      <Link href="/" className={styles.logo} aria-label="Resin Kalaakaari Home">
        <div>
          <Image
            src="/Logo/logo.png"
            alt="Resin Kalaakaari brand logo"
            width={120}
            height={60}
            priority
            className={styles.image}
          />
        </div>
      </Link>

      {/* --- RIGHT ACTIONS (USER & CART) --- */}
      <div className={styles.rightIcons}>
        {user ? (
          <div className={styles.userSection} ref={dropdownRef}>
            {/* 3. Dropdown Toggle */}
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className={styles.iconBtn}
              title={user.user_metadata?.full_name || "User Menu"}
              aria-haspopup="menu"
              aria-expanded={dropdownOpen}
              aria-label="Toggle user menu"
            >
              {/* Check for both avatar_url OR picture */}
              {user.user_metadata?.avatar_url || user.user_metadata?.picture ? (
                // eslint-disable-next-line @next/next/no-img-element -- Google avatar host is not in next.config remotePatterns
                <img
                  src={
                    user.user_metadata.avatar_url || user.user_metadata.picture
                  }
                  className={styles.avatar}
                  alt={`Profile picture of ${user.user_metadata.full_name || "user"}`}
                  referrerPolicy="no-referrer" // CRITICAL for Google images
                />
              ) : (
                <FiUser className={styles.FiUser} aria-hidden="true" />
              )}
            </button>

            {/* 4. Dropdown Menu */}
            {dropdownOpen && (
              <div
                className={styles.dropdown}
                role="menu"
                aria-label="User account menu"
              >
                <div className={styles.dropdownHeader} role="presentation">
                  <p className={styles.userName}>
                    {user.user_metadata?.full_name || "Art Lover"}
                  </p>
                  <p className={styles.userEmail}>{user.email}</p>
                </div>
                <hr aria-hidden="true" />
                <Link
                  href="/profile"
                  onClick={() => setDropdownOpen(false)}
                  className={styles.dropdownItem}
                  role="menuitem"
                >
                  <FiUser aria-hidden="true" /> Profile
                </Link>
                <Link
                  href="/my-orders"
                  onClick={() => setDropdownOpen(false)}
                  className={styles.dropdownItem}
                  role="menuitem"
                >
                  <FiPackage aria-hidden="true" /> My Orders
                </Link>
                {showAdminLink && (
                  <Link
                    href="/admin"
                    onClick={() => setDropdownOpen(false)}
                    className={styles.dropdownItem}
                    role="menuitem"
                  >
                    <FiGrid aria-hidden="true" /> Admin
                  </Link>
                )}
                <hr aria-hidden="true" />
                <button
                  onClick={handleLogout}
                  className={styles.logoutBtn}
                  role="menuitem"
                >
                  <FiLogOut aria-hidden="true" /> Logout
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link
            href="/login"
            className={styles.cartLink}
            aria-label="Log in to your account"
          >
            <FiUser className={styles.FiUser} aria-hidden="true" />
          </Link>
        )}

        {/* --- CART BUTTON --- */}
        <Link
          href="/cart"
          className={styles.cartLink}
          aria-label={`Shopping cart, ${totalItems} items`}
        >
          <FiShoppingCart
            className={styles.FiShoppingCart}
            aria-hidden="true"
          />
          {totalItems > 0 && (
            <span className={styles.badge} aria-hidden="true">
              {totalItems}
            </span>
          )}
        </Link>
      </div>

      {/* --- MOBILE DRAWER MENU --- */}
      <div
        id="mobile-menu"
        className={`${styles.mobileMenu} ${open ? styles.active : ""}`}
        aria-hidden={!open}
      >
        <Link href="/products" onClick={() => setOpen(false)}>
          Products
        </Link>
        <Link href="/about-us" onClick={() => setOpen(false)}>
          About Us
        </Link>
        <Link href="/contact-us" onClick={() => setOpen(false)}>
          Contact Us
        </Link>
      </div>

      {/* Background Dimming when Mobile Menu is Open */}
      {open && (
        <div
          className={styles.overlay}
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}
    </nav>
  );
}
