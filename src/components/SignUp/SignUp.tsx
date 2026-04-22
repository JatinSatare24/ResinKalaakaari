'use client';

// --- IMPORTS ---
import React, { useState } from 'react';
import type { FormEvent } from 'react';
import { client } from '@/lib/supabase';
import styles from './SignUp.module.css';

// --- INTERFACES ---
export interface SignUpPayload {
    full_name: string;
}

// --- COMPONENT ---
export default function SignUpPage() {
    // --- STATE & UTILS ---
    const supabase = client();
    const [message, setMessage] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [isSuccess, setIsSuccess] = useState<boolean>(false);

    // --- HANDLERS ---

    // 1. Google OAuth (Signup/Login Unified)
    const handleGoogleSignUp = async () => {
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/auth/callback`,
                },
            });
            if (error) setMessage(error.message);
        } catch (err: unknown) {
            console.error("Google OAuth Exception:", err);
            setMessage("An unexpected error occurred during Google Sign up.");
        }
    };

    // 2. Manual Email/Password Signup
    const handleManualSignUp = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        try {
            const formData = new FormData(e.currentTarget);
            const email = formData.get('email') as string;
            const password = formData.get('password') as string;
            const fullName = formData.get('fullName') as string;

            const { error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    // picked up by Supabase database trigger
                    data: {
                        full_name: fullName,
                    } as SignUpPayload,
                    emailRedirectTo: `${window.location.origin}/auth/callback`,
                },
            });

            if (error) {
                setMessage(error.message);
            } else {
                setIsSuccess(true);
                setMessage('Signup successful! Check your email to verify your account.');
            }
        } catch (err: unknown) {
            console.error("Manual Sign Up Exception:", err);
            setMessage("A network error occurred. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    // --- RENDER: SUCCESS STATE ---
    if (isSuccess) {
        return (
            <main className={styles.container}>
                <div className={styles.card} role="alert" aria-live="polite">
                    <h1 className={styles.title}>Welcome to the Tribe!</h1>
                    <p className={styles.successMessage}>{message}</p>
                    <a href="/login" className={styles.link}>Back to Login</a>
                </div>
            </main>
        );
    }

    // --- RENDER: DEFAULT STATE ---
    return (
        <main className={styles.container}>
            <div className={styles.card}>
                <h1 className={styles.title}>Create an Account</h1>
                <p className={styles.subtitle}>Start your Resin Kalaakaari journey</p>

                {/* Social Auth */}
                <button
                    onClick={handleGoogleSignUp}
                    className={styles.googleButton}
                    aria-label="Sign up using your Google account"
                >
                    <img
                        src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                        width="18"
                        alt=""
                        aria-hidden="true"
                    />
                    Sign up with Google
                </button>

                <div className={styles.divider} aria-hidden="true">
                    <span>or use email</span>
                </div>

                {/* Manual Auth Form */}
                <form
                    onSubmit={handleManualSignUp}
                    className={styles.form}
                    aria-label="Manual registration form"
                >
                    <input
                        name="fullName"
                        type="text"
                        placeholder="Full Name"
                        required
                        className={styles.input}
                        aria-label="Full Name"
                        autoComplete="name"
                    />
                    <input
                        name="email"
                        type="email"
                        placeholder="Email Address"
                        required
                        className={styles.input}
                        aria-label="Email Address"
                        autoComplete="email"
                    />
                    <input
                        name="password"
                        type="password"
                        placeholder="Password (min. 6 chars)"
                        required
                        minLength={6}
                        className={styles.input}
                        aria-label="Password"
                        autoComplete="new-password"
                    />

                    <button
                        type="submit"
                        className={styles.button}
                        disabled={loading}
                        aria-busy={loading}
                    >
                        {loading ? 'Creating Account...' : 'Sign Up'}
                    </button>
                </form>

                {/* Error Messaging */}
                <div aria-live="assertive">
                    {message && <p className={styles.errorMessage}>{message}</p>}
                </div>

                <p className={styles.footer}>
                    Already have an account?{' '}
                    <a href="/login" className={styles.link}>Login</a>
                </p>
            </div>
        </main>
    );
}