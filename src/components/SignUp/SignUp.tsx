'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import { client } from '@/lib/supabase'; // Using your unified client
import styles from './SignUp.module.css';

export default function SignUpPage() {
    const supabase = client();
    const [message, setMessage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    // 1. Google OAuth (Signup/Login Unified)
    const handleGoogleSignUp = async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
            },
        });
        if (error) setMessage(error.message);
    };

    // 2. Manual Email/Password Signup
    const handleManualSignUp = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        const formData = new FormData(e.currentTarget);
        const email = formData.get('email') as string;
        const password = formData.get('password') as string;
        const fullName = formData.get('fullName') as string;

        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                // This 'data' is picked up by your Supabase trigger!
                data: {
                    full_name: fullName,
                },
                emailRedirectTo: `${window.location.origin}/auth/callback`,
            },
        });

        if (error) {
            setMessage(error.message);
        } else {
            setIsSuccess(true);
            setMessage('Signup successful! Check your email to verify your account.');
        }
        setLoading(false);
    };

    if (isSuccess) {
        return (
            <div className={styles.container}>
                <div className={styles.card}>
                    <h1 className={styles.title}>Welcome to the Tribe!</h1>
                    <p className={styles.successMessage}>{message}</p>
                    <a href="/login" className={styles.link}>Back to Login</a>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <h1 className={styles.title}>Create an Account</h1>
                <p className={styles.subtitle}>Start your Resin Kalaakaari journey</p>

                <button onClick={handleGoogleSignUp} className={styles.googleButton}>
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width="18" alt="" />
                    Sign up with Google
                </button>

                <div className={styles.divider}>
                    <span>or use email</span>
                </div>

                <form onSubmit={handleManualSignUp} className={styles.form}>
                    <input
                        name="fullName"
                        type="text"
                        placeholder="Full Name"
                        required
                        className={styles.input}
                    />
                    <input
                        name="email"
                        type="email"
                        placeholder="Email Address"
                        required
                        className={styles.input}
                    />
                    <input
                        name="password"
                        type="password"
                        placeholder="Password (min. 6 chars)"
                        required
                        minLength={6}
                        className={styles.input}
                    />

                    <button type="submit" className={styles.button} disabled={loading}>
                        {loading ? 'Creating Account...' : 'Sign Up'}
                    </button>
                </form>

                {message && <p className={styles.errorMessage}>{message}</p>}

                <p className={styles.footer}>
                    Already have an account?{' '}
                    <a href="/login" className={styles.link}>Login</a>
                </p>
            </div>
        </div>
    );
}