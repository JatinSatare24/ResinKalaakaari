// --- IMPORTS ---
import React from "react";
import styles from "@/components/Spinner/Spinner.module.css";

// --- INTERFACES ---
export interface LoaderProps {
  /** The message to display under the spinning icon */
  message: string;
}

// --- COMPONENT ---
/**
 * Loader: A centralized spinner component for Resin Kalaakaari.
 * Handles layout jumps with a defined min-height and provides
 * visual feedback during data fetching.
 */
const Loader: React.FC<LoaderProps> = ({ message }) => {
  // --- RENDER ---
  return (
    <div
      className={styles.wrapper}
      aria-live="polite" // a11y: Notifies assistive tech when the loader appears/disappears
      aria-busy="true" // a11y: Indicates the container is currently busy loading
    >
      {/* --- VISUAL ELEMENTS --- */}
      <div className={styles.spinner} role="status" aria-label="Loading">
        {/* a11y: Screen reader text within the spinner */}
        <span className={styles.srOnly}>Loading...</span>
      </div>

      <p className={styles.text}>{message}...</p>
    </div>
  );
};

export default Loader;
