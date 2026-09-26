// --- IMPORTS ---
import Link from "next/link";
import styles from "./NotFoundUI.module.css";

// --- INTERFACES ---
export interface NotFoundUIProps {
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
    title,
    subtitle,
    linkText,
    linkHref,
}: NotFoundUIProps) {
    // --- RENDER ---
    return (
        <main className={styles.wrapper}>
            <span className={styles.emoji} aria-hidden="true">
                🙈
            </span>
            <h1 className={styles.title}>{title}</h1>
            <p className={styles.subtitle}>{subtitle}</p>
            <Link href={linkHref} className={styles.link}>
                {linkText}
            </Link>
        </main>
    );
}