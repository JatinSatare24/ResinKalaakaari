// --- IMPORTS ---
import React from 'react';
import { FiPhone, FiMail, FiMapPin, FiClock } from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import styles from '@/components/ContactUs/ContactUs.module.css';

// --- INTERFACES ---
export interface ContactUsProps {
    /** * Interface established for future prop drilling 
     * (e.g., dynamic contact data from a CMS) 
     */
}

// --- COMPONENT ---
const ContactUs: React.FC<ContactUsProps> = () => {
    // --- STATE & LIFECYCLE ---
    // (Reserved for future interactive logic like a contact form state)

    // --- RENDER ---
    return (
        <main className={styles.contactContainer} aria-labelledby="contact-heading">

            {/* --- HEADER SECTION --- */}
            <header className={styles.header}>
                <h1 id="contact-heading" className={styles.title}>Get in Touch</h1>
                <p className={styles.subtitle}>
                    Have a question about a custom order? I'd love to hear from you.
                </p>
            </header>

            {/* --- MAIN CONTENT GRID --- */}
            <div className={styles.contentGrid}>

                {/* --- LEFT SIDE: CONTACT INFO --- */}
                <address className={styles.infoSide} style={{ fontStyle: 'normal' }}>

                    {/* Phone Contact */}
                    <section className={styles.contactCard} aria-label="Phone contact information">
                        <div className={styles.iconBox} aria-hidden="true">
                            <FiPhone />
                        </div>
                        <div>
                            <h3>Phone</h3>
                            <p>+91 90222 23759</p>
                        </div>
                    </section>

                    {/* Email Contact */}
                    <section className={styles.contactCard} aria-label="Email contact information">
                        <div className={styles.iconBox} aria-hidden="true">
                            <FiMail />
                        </div>
                        <div>
                            <h3>Email</h3>
                            <p>resin.kalaakaari@gmail.com</p>
                        </div>
                    </section>

                    {/* Studio Location */}
                    <section className={styles.contactCard} aria-label="Studio location">
                        <div className={styles.iconBox} aria-hidden="true">
                            <FiMapPin />
                        </div>
                        <div>
                            <h3>Location</h3>
                            <p>Pune, Maharashtra, India</p>
                        </div>
                    </section>

                    {/* Studio Hours */}
                    <section className={styles.contactCard} aria-label="Studio business hours">
                        <div className={styles.iconBox} aria-hidden="true">
                            <FiClock />
                        </div>
                        <div>
                            <h3>Open Hours</h3>
                            <p>Mon - Sat: 09:00 AM - 06:00 PM</p>
                        </div>
                    </section>

                    {/* --- CALL TO ACTION --- */}
                    {/* Primary CTA for Manual Payments / Inquiries */}
                    <a
                        href="https://wa.me/919022223759"
                        target="_blank"
                        rel="noreferrer noopener" // Security best practice
                        className={styles.whatsappBtn}
                        aria-label="Contact us via WhatsApp for custom orders or payment verification"
                    >
                        <FaWhatsapp aria-hidden="true" /> Chat on WhatsApp
                    </a>
                </address>

                {/* --- RIGHT SIDE: MAP --- */}
                <section className={styles.mapSide} aria-label="Interactive map showing Pune region">
                    <iframe
                        title="Resin Kalaakaari Studio Location"
                        src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3781.6837383929296!2d73.8129471!3d18.5882917!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bc2b9602032e8a1%3A0x7bf5bd72b14bbdae!2sResin%20Kalaakaari!5e0!3m2!1sen!2sin!4v1777040914200!5m2!1sen!2sin"
                        width="100%"
                        height="100%"
                        style={{ border: 0, borderRadius: '20px' }}
                        allowFullScreen={true}
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                    />
                </section>

            </div>
        </main>
    );
}

export default ContactUs;