"use client";

// --- IMPORTS ---
import {
  useOptimistic,
  useState,
  useTransition,
  type ChangeEvent,
} from "react";
import { updateOrderStatus } from "@/app/admin/orders/actions";
import FormError from "@/components/FormError/FormError";
import {
  ADMIN_SETTABLE_STATUSES,
  formatStatus,
  shortOrderId,
} from "@/lib/orders";
import styles from "@/components/Admin/Orders/Orders.module.css";

// --- INTERFACES ---
export interface OrderStatusSelectProps {
  orderId: string;
  status: string; // the status the server last sent
}

// --- COMPONENT ---
// The only client piece of the admin page: it needs an onChange. It sends the
// new status to the server action; the server re-validates everything.
export default function OrderStatusSelect({
  orderId,
  status,
}: OrderStatusSelectProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // Shows the new choice at once. If the action fails, React drops it and the
  // select snaps back to `status` (the server's value) by itself.
  const [shownStatus, setShownStatus] = useOptimistic(status);

  function handleChange(event: ChangeEvent<HTMLSelectElement>) {
    const next = event.target.value;
    setError(null);
    startTransition(async () => {
      setShownStatus(next);
      const result = await updateOrderStatus(orderId, next);
      if (!result.ok) setError(result.message);
    });
  }

  // "verifying_payment" is a status the customer sets, not the admin. If an
  // order is in it (or any unknown value) we still show it, but disabled.
  const isSettable = (ADMIN_SETTABLE_STATUSES as readonly string[]).includes(
    status,
  );

  return (
    <div>
      <select
        value={shownStatus}
        onChange={handleChange}
        disabled={isPending}
        aria-busy={isPending}
        className={styles.statusSelect}
        aria-label={`Change status for order RK-${shortOrderId(orderId)}`}
      >
        {!isSettable && (
          <option value={status} disabled>
            {formatStatus(status)}
          </option>
        )}
        {ADMIN_SETTABLE_STATUSES.map((value) => (
          <option key={value} value={value}>
            {formatStatus(value)}
          </option>
        ))}
      </select>
      {error && <FormError>{error}</FormError>}
    </div>
  );
}
