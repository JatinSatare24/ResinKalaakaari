// --- IMPORTS ---
import React from 'react';
import Link from "next/link";
import { FiInstagram, FiMail, FiLinkedin } from 'react-icons/fi';
import { CiLinkedin } from "react-icons/ci";
import { FaWhatsapp } from 'react-icons/fa';
import styles from "@/components/Footer/Footer.module.css";

// --- INTERFACES ---
export interface FooterProps {
    /** Interface established for future scalability 
     * (e.g., dynamic copyright text or dynamic link arrays) */
}

// --- COMPONENT ---
export default function Footer() {
    // --- STATE & UTILS ---
    const currentYear = new Date().getFullYear();

    // --- RENDER ---
    return (
        <footer className={styles.footer} aria-label="Site Footer">
            <div className={styles.container}>

                {/* --- BRAND SECTION --- */}
                <section className={styles.section} aria-labelledby="footer-brand-name">
                    <h2 id="footer-brand-name" className={styles.logo}>Resin Kalaakaari</h2>
                    <p className={styles.description}>
                        Resin Kalaakaari creates handcrafted resin art that preserves life’s
                        most cherished memories. Each piece is designed with passion,
                        precision, and creativity.
                    </p>
                </section>

                {/* --- QUICK LINKS SECTION --- */}
                <section className={styles.section} aria-labelledby="footer-quick-links">
                    <h3 id="footer-quick-links" className={styles.heading}>Quick Links</h3>
                    <ul role="list">
                        <li><Link href="/">Home</Link></li>
                        <li><Link href="/products">Shop</Link></li>
                        <li><Link href="/#featuredProducts">Featured Products</Link></li>
                        <li><Link href="/#gallery">Gallery</Link></li>
                        <li><Link href="/#testimonials">Testimonials</Link></li>
                    </ul>
                </section>

                {/* --- COMPANY / SUPPORT SECTION --- */}
                <section className={styles.section} aria-labelledby="footer-company-links">
                    <h3 id="footer-company-links" className={styles.heading}>Company</h3>
                    <ul role="list">
                        <li><Link href="/about-us">Our Story</Link></li>
                        <li><Link href="/contact-us">Contact Us</Link></li>
                        <li><Link href="/shipping-policy">Shipping Policy</Link></li>
                        <li><Link href="/privacy-policy">Privacy Policy</Link></li>
                        <li><Link href="/terms-and-conditions">Terms & Conditions</Link></li>
                    </ul>
                </section>

                {/* --- SOCIAL LINKS SECTION --- */}
                <section className={styles.section} aria-labelledby="footer-social-links">
                    <h3 id="footer-social-links" className={styles.heading}>Connect With Us</h3>
                    <ul className={styles.social} role="list">
                        <li className={styles.socialLinks}>
                            <a
                                href="https://www.instagram.com/resin_kalaakaari?igsh=bGdsNmtua2g4d3h0"
                                target="_blank"
                                rel="noopener noreferrer"
                                className={styles.socialLink}
                                aria-label="Visit our Instagram profile"
                            >
                                <FiInstagram className={styles.icon} aria-hidden="true" /> Instagram
                            </a>
                        </li>
                        <li className={styles.socialLinks}>
                            <a
                                href="https://wa.me/919022223759"
                                target="_blank"
                                rel="noopener noreferrer"
                                className={styles.socialLink}
                                aria-label="Chat with us on WhatsApp"
                            >
                                <FaWhatsapp className={styles.icon} aria-hidden="true" /> WhatsApp
                            </a>
                        </li>
                        <li className={styles.socialLinks}>
                            <a
                                href="mailto:resin.kalaakaari@gmail.com"
                                className={styles.socialLink}
                                aria-label="Send us an email"
                            >
                                <FiMail className={styles.icon} aria-hidden="true" /> Email Us
                            </a>
                        </li>
                        <li className={styles.socialLinks}>
                            <a
                                href="https://www.linkedin.com/in/resin-kalaakaari-b6a634372/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className={styles.socialLink}
                                aria-label="Visit our LinkedIn profile"
                            >
                                <FiLinkedin className={styles.icon} aria-hidden="true" /> LinkedIn
                            </a>
                        </li>
                    </ul>
                </section>

            </div>

            {/* --- BOTTOM BAR --- */}
            <div className={styles.bottom}>
                <p>
                    © {currentYear} Resin Kalaakaari. All rights reserved.
                </p>
            </div>
        </footer>
    );
}
