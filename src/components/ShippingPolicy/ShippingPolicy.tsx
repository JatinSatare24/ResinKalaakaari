/**
 * SHIPPING POLICY & GUIDELINES
 * This component displays Sanika's specific order processing and shipping rules.
 * Last Updated: April 21, 2026
 */

// --- IMPORTS ---
import React from 'react';
import styles from '@/components/Policies/Policies.module.css';

// --- INTERFACES ---
export interface ShippingPolicyProps {
  // Interface established for future scalability (e.g., dynamic shipping rates)
}

// --- COMPONENT ---
export default function ShippingPolicy(props: ShippingPolicyProps) {
  // --- RENDER ---
  return (
    <main className={styles.container} aria-labelledby="shipping-policy-title">
      {/* --- HEADER SECTION --- */}
      <h1 id="shipping-policy-title" className={styles.title}>Order Process & Guidelines</h1>

      <p className={styles.introText}>
        We strive to provide a smooth and reliable delivery experience for all our customers.
        Kindly review the following points before placing your order.
      </p>

      {/* --- 1. PROCESSING & DISPATCH --- */}
      <section className={styles.section} aria-labelledby="processing-heading">
        <h2 id="processing-heading">Order Processing & Dispatch</h2>
        <p>Orders are processed within standard timelines after confirmation.</p>
        <ul>
          <li>
            <strong className={styles.highlight}>Handcrafted Curing:</strong> Standard items take 10–15 business days.
          </li>
          <li>
            <strong className={styles.highlight}>Flower Preservation:</strong> Up to 1 month due to drying and multi-layer pouring.
          </li>
          <li>
            <strong className={styles.highlight}>Finality:</strong> Once an order has been shipped, it is considered final.
          </li>
        </ul>
      </section>

      {/* --- 2. CHANGES AFTER SHIPPING --- */}
      <section className={styles.section} aria-labelledby="changes-heading">
        <h2 id="changes-heading">Changes After Shipping</h2>
        <div className={styles.alertBox} role="note">
          <p>
            We sincerely request you to <strong className={styles.highlight}>double-check your details</strong> before placing the order,
            as we will not be able to make any changes once the order is dispatched.
          </p>
        </div>
        <p>This includes:</p>
        <ul>
          <li>Delivery address updates</li>
          <li>Order modifications</li>
          <li>Cancellations or refunds</li>
        </ul>
      </section>

      {/* --- 3. DELIVERY TIMELINES --- */}
      <section className={styles.section} aria-labelledby="timelines-heading">
        <h2 id="timelines-heading">Delivery Timelines</h2>
        <p>Deliveries typically take <strong className={styles.highlight}>3–4 business days</strong> under normal conditions.</p>
        <p>
          Depending on the location, deliveries may take longer and can extend
          beyond a week for certain areas.
        </p>

        {/* Possible Delays Subsection */}
        <h3 style={{ marginTop: '15px', fontSize: '1.1rem' }}>Possible Delays</h3>
        <p>
          While we do our best to ensure timely delivery, there may be occasional delays due to
          factors beyond our control such as holidays, high demand, or logistical constraints.
        </p>
      </section>

      {/* --- 4. RESPONSIBILITY & TRACKING --- */}
      <section className={styles.section} aria-labelledby="responsibility-heading">
        <h2 id="responsibility-heading">Customer Responsibility & Tracking</h2>
        <p>
          We kindly request customers to provide <strong className={styles.highlight}>complete and accurate</strong> shipping details
          to avoid any delays or delivery issues.
        </p>
        <div
          className={styles.noteBox}
          style={{ marginTop: '10px', padding: '10px', background: '#f9f9f9', borderRadius: '5px' }}
        >
          <p>
            <strong className={styles.highlight}>Tracking:</strong> Tracking details will be shared once your order has been shipped
            so you can stay updated on your delivery.
          </p>
        </div>
      </section>

      {/* --- 5. PAYMENT & DAMAGE POLICY (Retained Business Safeguards) --- */}
      <section className={styles.section} aria-labelledby="claims-heading">
        <h2 id="claims-heading">Payment & Claims</h2>
        <p>
          As each item is custom-made, orders are confirmed only after
          an <span className={styles.highlight}>advance payment</span> is received.
        </p>
        <div
          className={styles.alertBox}
          style={{ borderLeft: '4px solid #e74c3c', marginTop: '15px' }}
          role="alert"
        >
          <p>
            <strong className={styles.highlight}>Mandatory for Damage Claims:</strong> An unboxing video is required.
            The video must be continuous, unedited, and show the package being opened for the first time.
          </p>
        </div>
      </section>
    </main>
  );
}