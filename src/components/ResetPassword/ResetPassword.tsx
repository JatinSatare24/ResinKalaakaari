"use client";

// --- IMPORTS ---
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { client } from "@/lib/supabase";
import styles from "@/components/Login/Login.module.css";

// --- COMPONENT ---
export default function ResetPassword() {
  // --- STATE ---
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  // --- UTILS ---
  // Lazy initializer: client() runs once on first render, then the same instance is reused
  const [supabase] = useState(() => client());
  const router = useRouter();

  // --- EFFECTS ---
  // After a successful update, wait 2s so the user can read the message, then leave.
  // Living in useEffect (not inside the handler) lets us cancel the timer.
  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(() => {
      router.push("/");
      router.refresh(); // re-run Server Components with the current session
    }, 2000);
    return () => clearTimeout(timer); // cleanup: cancel if the user leaves before 2s
  }, [success, router]);

  // --- HANDLERS ---
  const handleUpdatePassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Validation Logic
    if (password !== confirmPassword) {
      setErrorMessage("Passwords don't match!");
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      // Supabase Password Update
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        setErrorMessage(error.message);
        setLoading(false);
      } else {
        setSuccess(true); // the useEffect above handles the delayed redirect
      }
    } catch (err: unknown) {
      console.error("Password update unexpected error:", err);
      setErrorMessage(
        "An unexpected network error occurred. Please try again.",
      );
      setLoading(false);
    }
  };

  // --- RENDER ---
  return (
    <main className={styles.authContainer} aria-labelledby="reset-title">
      <h1 id="reset-title" className={styles.title}>
        New Password
      </h1>
      <p className={styles.subtitle}>Enter your new sanctuary key</p>

      {/* --- CONDITIONAL VIEWS --- */}
      {success ? (
        <div style={{ textAlign: "center" }} role="alert" aria-live="assertive">
          <p style={{ color: "#2ecc71", marginBottom: "20px" }}>
            Password updated successfully! Taking you to the home page...
          </p>
        </div>
      ) : (
        <form onSubmit={handleUpdatePassword} aria-label="Password reset form">
          {/* New Password Input */}
          <input
            id="new-password"
            className={styles.inputField}
            type="password"
            placeholder="New Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete="new-password"
            aria-label="New Password"
          />

          {/* Confirm Password Input */}
          <input
            id="confirm-password"
            className={styles.inputField}
            type="password"
            placeholder="Confirm New Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            autoComplete="new-password"
            aria-label="Confirm New Password"
          />

          {/* Error Alerts */}
          {errorMessage && (
            <p className={styles.errorText} role="alert">
              {errorMessage}
            </p>
          )}

          {/* Submit Action */}
          <button
            type="submit"
            disabled={loading}
            className={styles.primaryBtn}
            aria-busy={loading}
          >
            {loading ? "Updating..." : "Update Password"}
          </button>
        </form>
      )}
    </main>
  );
}
