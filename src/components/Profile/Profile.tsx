"use client";

// --- IMPORTS ---
import {
  useState,
  useTransition,
  type ChangeEvent,
  type FormEvent,
} from "react";
import Link from "next/link";
import { saveProfile } from "@/app/profile/actions";
import FormError from "@/components/FormError/FormError";
import { hasErrors, parseShipping, type ShippingErrors } from "@/lib/checkout";
import { validateProfile } from "@/lib/profile";
import type { ShippingDetails } from "@/lib/types";
import styles from "@/components/Profile/Profile.module.css";

// --- INTERFACES ---
export interface ProfileProps {
  initial: ShippingDetails; // saved details, loaded on the server
  email: string; // shown read-only
}

// --- COMPONENT ---
// Only the form is interactive, so it is the only client code. The page
// (Server Component) loads the data and checks the session.
export default function Profile({ initial, email }: ProfileProps) {
  const [form, setForm] = useState<ShippingDetails>(initial);
  const [fieldErrors, setFieldErrors] = useState<ShippingErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleChange =
    (name: keyof ShippingDetails) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [name]: event.target.value }));
      setSaved(false);
    };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaved(false);
    setFormError(null);

    // Instant feedback. The server action runs the same rules again.
    const details = parseShipping(form);
    const errors = validateProfile(details);
    setFieldErrors(errors);
    if (hasErrors(errors)) return;

    startTransition(async () => {
      const result = await saveProfile(details);
      if (result.ok) {
        setSaved(true);
        return;
      }
      setFieldErrors(result.fieldErrors ?? {});
      setFormError(result.message);
    });
  };

  const fieldProps = (name: keyof ShippingDetails) => ({
    value: form[name],
    onChange: handleChange(name),
    "aria-invalid": fieldErrors[name] ? true : undefined,
    "aria-describedby": fieldErrors[name] ? `${name}-error` : undefined,
    style: fieldErrors[name] ? { borderColor: "#dc2626" } : undefined,
  });
  const errorFor = (name: keyof ShippingDetails) =>
    fieldErrors[name] ? (
      <FormError id={`${name}-error`}>{fieldErrors[name]}</FormError>
    ) : null;

  return (
    // The layout already provides <main>, so this is a section.
    <section className={styles.container} aria-labelledby="profile-title">
      <header className={styles.header}>
        <h1 id="profile-title">Your Profile</h1>
        {/* A real link (keyboard, middle-click) instead of router.push. */}
        <Link href="/my-orders" className={styles.ordersShortcut}>
          📦 View My Orders
        </Link>
      </header>

      {/* noValidate: we show our own messages instead of browser bubbles. */}
      <form
        onSubmit={handleSubmit}
        className={styles.form}
        aria-label="Edit Profile Details"
        noValidate
      >
        <section
          className={styles.section}
          aria-labelledby="personal-details-heading"
        >
          <h2 id="personal-details-heading">Personal Details</h2>
          <input
            {...fieldProps("full_name")}
            type="text"
            placeholder="Full Name"
            aria-label="Full Name"
            autoComplete="name"
          />
          {errorFor("full_name")}
          <input
            type="email"
            aria-label="Email (cannot be changed)"
            value={email}
            disabled
            className={styles.disabledInput}
          />
          <input
            {...fieldProps("phone")}
            type="tel"
            placeholder="Phone Number"
            aria-label="Phone Number"
            autoComplete="tel"
          />
          {errorFor("phone")}
        </section>

        <section
          className={styles.section}
          aria-labelledby="shipping-address-heading"
        >
          <h2 id="shipping-address-heading">Shipping Address</h2>
          <textarea
            {...fieldProps("address_line")}
            placeholder="Full Address"
            aria-label="Full Shipping Address"
            rows={3}
            autoComplete="street-address"
          />
          {errorFor("address_line")}
          <div className={styles.row}>
            <input
              {...fieldProps("city")}
              type="text"
              placeholder="City"
              aria-label="City"
              autoComplete="address-level2"
            />
            <input
              {...fieldProps("state")}
              type="text"
              placeholder="State"
              aria-label="State"
              autoComplete="address-level1"
            />
            <input
              {...fieldProps("pincode")}
              type="text"
              inputMode="numeric"
              placeholder="Pincode"
              aria-label="Pincode"
              autoComplete="postal-code"
            />
          </div>
          {errorFor("city")}
          {errorFor("state")}
          {errorFor("pincode")}
        </section>

        {formError && <FormError>{formError}</FormError>}
        {/* Replaces the old alert() popup. role="status" is announced politely. */}
        {saved && (
          <p role="status" className={styles.saved}>
            Profile saved.
          </p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className={styles.saveBtn}
          aria-busy={isPending}
        >
          {isPending ? "Saving..." : "Save Changes"}
        </button>
      </form>
    </section>
  );
}
