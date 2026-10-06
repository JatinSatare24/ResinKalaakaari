import styles from "@/components/Spinner/Spinner.module.css";

export interface LoaderProps {
  /** The message to display under the spinning icon */
  message: string;
  /** "page" (default) fills the screen; "section" is for one block of a page. */
  variant?: "page" | "section";
}

/**
 * Loader: the one spinner used for every loading state in Resin Kalaakaari.
 * It reserves space (a full screen, or a section's worth) so the page does not
 * jump when the real content arrives.
 *
 * A Server Component: it has no state or effects, so it ships no JavaScript.
 * The automatic JSX runtime means there is no `import React` here.
 */
export default function Loader({ message, variant = "page" }: LoaderProps) {
  const wrapperClass =
    variant === "section"
      ? `${styles.wrapper} ${styles.section}`
      : styles.wrapper;

  return (
    // a11y: aria-live tells assistive tech when the loader appears or goes
    // away, and aria-busy says this area is still loading.
    <div className={wrapperClass} aria-live="polite" aria-busy="true">
      <div className={styles.spinner} role="status" aria-label="Loading">
        {/* a11y: text for screen readers only */}
        <span className={styles.srOnly}>Loading...</span>
      </div>

      <p className={styles.text}>{message}...</p>
    </div>
  );
}
