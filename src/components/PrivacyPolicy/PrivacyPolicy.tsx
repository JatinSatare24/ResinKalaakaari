// --- IMPORTS ---
import React from 'react';
import styles from '@/components/Policies/Policies.module.css';

// --- INTERFACES ---
export interface PrivacyPolicyProps {
  // Interface established for future scalability (e.g., passing dynamic locale data)
}

// --- COMPONENT ---
const PrivacyPolicy: React.FC<PrivacyPolicyProps> = () => {
  // --- RENDER ---
  return (
    <main className={styles.container} aria-labelledby="privacy-policy-title">
      {/* --- HEADER --- */}
      <h1 id="privacy-policy-title" className={styles.title}>Privacy Policy</h1>

      <p className={styles.introText}>
        At Resin Kalaakaari, we value your privacy. This policy outlines how we
        handle your personal information when you shop with us.
      </p>

      {/* --- POLICY SECTIONS --- */}
      <section className={styles.section} aria-labelledby="policy-1-title">
        <h2 id="policy-1-title">1. Information We Collect</h2>
        <p>
          To fulfill your order, we collect details such as your{' '}
          <strong className={styles.highlight}>Name, Shipping Address,
            Email, and Phone Number</strong>. We only collect information that you voluntarily provide
          during the checkout or contact process.
        </p>
      </section>

      <section className={styles.section} aria-labelledby="policy-2-title">
        <h2 id="policy-2-title">2. Use of Information</h2>
        <p>We use your information strictly for:</p>
        <ul>
          <li>Processing and delivering your handcrafted resin art.</li>
          <li>Communicating with you regarding order updates or customizations.</li>
          <li>Providing customer support and responding to inquiries.</li>
        </ul>
      </section>

      {/* FIXED LINE BELOW: added styles. */}
      <section className={styles.section} aria-labelledby="policy-3-title">
        <h2 id="policy-3-title">3. Payment Security</h2>
        <p>
          Payments are handled manually via UPI or Bank Transfer.{' '}
          <strong className={styles.highlight}>Resin Kalaakaari does not store your bank details or UPI pins.</strong> We only require a screenshot of the transaction for payment verification.
        </p>
      </section>

      <section className={styles.section} aria-labelledby="policy-4-title">
        <h2 id="policy-4-title">4. Data Protection</h2>
        <p>
          Your personal data is never sold, traded, or shared with third parties,
          except for the logistics partners required to deliver your package.
        </p>
      </section>
    </main>
  );
}

export default PrivacyPolicy;