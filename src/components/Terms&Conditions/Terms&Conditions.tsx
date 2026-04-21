// --- IMPORTS ---
import React from 'react';
import styles from '@/components/Policies/Policies.module.css';

// --- INTERFACES ---
export interface TermsAndConditionsProps {
    // Interface established for future scalability (e.g., dynamic "Last Updated" date)
}

// --- COMPONENT ---
const TermsAndConditions: React.FC<TermsAndConditionsProps> = () => {
    // --- RENDER ---
    return (
        <main className={styles.container} aria-labelledby="terms-title">
            <h1 id="terms-title" className={styles.title}>Terms & Conditions</h1>

            {/* --- 1. PRODUCT NATURE --- */}
            <section className={styles.section} aria-labelledby="artistic-nature-heading">
                <h2 id="artistic-nature-heading">1. Artistic Nature of Products</h2>
                <p>
                    Every item is <strong className={styles.highlight}>100% handcrafted</strong>.
                    Due to the nature of resin, minor imperfections like micro-bubbles or
                    slight color variations are natural and add to the unique character
                    of the piece. These are not considered defects.
                </p>
            </section>

            {/* --- 2. PAYMENTS --- */}
            <section className={styles.section} aria-labelledby="payment-process-heading">
                <h2 id="payment-process-heading">2. Manual Payment Process</h2>
                <p>
                    Orders are only processed once the <strong className={styles.highlight}>advance payment</strong> is confirmed.
                    After making a manual payment (UPI/Bank Transfer), you must share a
                    clear screenshot of the transaction with your Order ID for verification.
                </p>
            </section>

            {/* --- 3. CUSTOM COMMISSIONS --- */}
            <section className={styles.section} aria-labelledby="commissions-heading">
                <h2 id="commissions-heading">3. Custom Commissions (Flower Preservation)</h2>
                <p>
                    For flower preservation, the drying and curing process can take up to
                    <strong className={styles.highlight}>30 days</strong>. By placing an order,
                    you acknowledge and agree to this timeline.
                </p>
            </section>

            {/* --- 4. DAMAGE CLAIMS --- */}
            <section className={styles.section} aria-labelledby="damage-policy-heading">
                <h2 id="damage-policy-heading">4. Damage & Replacement Policy</h2>
                <div className={styles.alertBox} role="alert">
                    <p>
                        <strong className={styles.highlight}>Mandatory Unboxing Video:</strong> To be eligible for a replacement
                        in case of transit damage, you must provide a continuous, unedited unboxing
                        video. Claims without video proof will not be entertained.
                    </p>
                </div>
            </section>

            {/* --- 5. REFUND POLICY --- */}
            <section className={styles.section} aria-labelledby="refund-policy-heading">
                <h2 id="refund-policy-heading">5. No Refund Policy</h2>
                <p>
                    As our products are personalized and made-to-order, <strong className={styles.highlight}>we do not offer
                        refunds or cancellations</strong> once the production process has begun.
                </p>
            </section>
        </main>
    );
}

export default TermsAndConditions;