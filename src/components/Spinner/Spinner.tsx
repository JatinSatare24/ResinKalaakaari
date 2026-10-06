// --- IMPORTS ---
import React from "react";
import styles from "@/components/Spinner/Spinner.module.css";

// --- INTERFACES ---
export interface LoaderProps {
  /** The message to display under the spinning icon */
  message: string;
  /** "page" (default) fills the screen; "section" is for one block of a page. */
  variant?: "page" | "section";
}

// --- COMPONENT ---
/**
 * Loader: A centralized spinner component for Resin Kalaakaari.
 * Handles layout jumps with a defined min-height and provides
 * visual feedback during data fetching. Used for every loading state.
 */
const Loader: React.FC<LoaderProps> = ({ message, variant = "page" }) => {
  // --- RENDER ---
  return (
    <div
      className={`${styles.wrapper} ${variant === "section" ? styles.section : ""}`}
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
