// --- IMPORTS ---
import Link from "next/link";
import { FiCompass } from "react-icons/fi";
import styles from "@/components/NotFoundUI/NotFoundUI.module.css";

// --- INTERFACES ---
export interface NotFoundUIProps {
  eyebrow?: string; // small label above the title
  title: string;
  subtitle: string;
  linkText: string;
  linkHref: string;
}

// --- COMPONENT ---
// Reusable, prop-driven — not tied to the 404 route specifically.
// Same shape can back an "order not found" or "no products found" state
// later, just by passing different props.
export default function NotFoundUI({
  eyebrow = "404 Error",
  title,
  subtitle,
  linkText,
  linkHref,
}: NotFoundUIProps) {
  // --- RENDER ---
  return (
    // A <div>, not <main>: the root layout already provides the <main>.
    <div className={styles.wrapper}>
      <div className={styles.iconCircle}>
        <FiCompass className={styles.icon} aria-hidden="true" />
      </div>
      <p className={styles.eyebrow}>{eyebrow}</p>
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.subtitle}>{subtitle}</p>
      <Link href={linkHref} className={styles.link}>
        {linkText}
      </Link>
    </div>
  );
}
