// --- IMPORTS ---
import { FiAlertTriangle } from "react-icons/fi";
import styles from "@/components/ErrorUI/ErrorUI.module.css";

// --- INTERFACES ---
export interface ErrorUIProps {
  title: string;
  message: string;
  onRetry: () => void;
}

// --- COMPONENT ---
// Same look as NotFoundUI, but for "something broke" instead of "not there".
export default function ErrorUI({ title, message, onRetry }: ErrorUIProps) {
  return (
    <div className={styles.wrapper} role="alert">
      <div className={styles.iconCircle}>
        <FiAlertTriangle className={styles.icon} aria-hidden="true" />
      </div>
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.message}>{message}</p>
      <button type="button" className={styles.button} onClick={onRetry}>
        Try again
      </button>
    </div>
  );
}
