// --- IMPORTS ---
import type { ReactNode } from "react";
import styles from "@/components/FormError/FormError.module.css";

// --- INTERFACES ---
export interface FormErrorProps {
  id?: string; // lets an input point at its message with aria-describedby
  children: ReactNode;
}

// --- COMPONENT ---
// One red message line, announced by screen readers when it appears.
// Replaces alert() popups on the checkout and payment forms.
export default function FormError({ id, children }: FormErrorProps) {
  return (
    <p id={id} role="alert" className={styles.error}>
      {children}
    </p>
  );
}
