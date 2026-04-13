import Link from "next/link";
import styles from "./Footer.module.css";

export default function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className={styles.footer}>
            <div className={styles.container}>

                {/* Brand Section */}
                <div className={styles.section}>
                    <h2 className={styles.logo}>Resin Kalaakaari</h2>
                    <p className={styles.description}>
                        Resin Kalaakaari creates handcrafted resin art that preserves life’s
                        most cherished memories. Each piece is designed with passion,
                        precision, and creativity.
                    </p>
                </div>

                {/* Quick Links */}
                <div className={styles.section}>
                    <h3 className={styles.heading}>Quick Links</h3>
                    <ul>
                        <li><Link href="/">Home</Link></li>
                        <li><Link href="/products">Shop</Link></li>
                        <li><Link href="/#gallery">Gallery</Link></li>
                        <li><Link href="/#testimonials">Testimonials</Link></li>
                    </ul>
                </div>

                {/* Customer Support */}
                <div className={styles.section}>
                    <h3 className={styles.heading}>Customer Support</h3>
                    <ul>
                        <li><Link href="/contact">Contact Us</Link></li>
                        <li><Link href="#">Shipping Policy</Link></li>
                        <li><Link href="#">Privacy Policy</Link></li>
                        <li><Link href="#">Terms & Conditions</Link></li>
                    </ul>
                </div>

                {/* Social Links */}
                <div className={styles.section}>
                    <h3 className={styles.heading}>Connect With Us</h3>
                    <ul className={styles.social}>
                        <li>
                            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer">
                                Instagram
                            </a>
                        </li>
                        <li>
                            <a href="https://wa.me/919999999999" target="_blank" rel="noopener noreferrer">
                                WhatsApp
                            </a>
                        </li>
                        <li>
                            <a href="mailto:hello@resinkalaakaari.com">
                                Email Us
                            </a>
                        </li>
                    </ul>
                </div>

            </div>

            {/* Bottom Bar */}
            <div className={styles.bottom}>
                <p>
                    © {currentYear} Resin Kalaakaari. All rights reserved.
                </p>
            </div>
        </footer>
    );
}