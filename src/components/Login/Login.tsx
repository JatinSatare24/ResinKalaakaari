'use client'

// --- IMPORTS ---
import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { client } from '@/lib/supabase'
import styles from '@/components/Login/Login.module.css'

// --- INTERFACES ---
export interface LoginPageProps {
    // Reserved for future scalability or prop-drilling
}

// --- COMPONENT ---
export default function LoginPage(props: LoginPageProps) {
    // --- STATE ---
    const [email, setEmail] = useState<string>('')
    const [password, setPassword] = useState<string>('')
    const [loading, setLoading] = useState<boolean>(false)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const [successMessage, setSuccessMessage] = useState<string | null>(null)

    // --- UTILS ---
    const supabase = client()
    const router = useRouter()

    // --- HANDLERS ---
    const handleGoogleLogin = async () => {
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/auth/callback`,
                },
            })
            if (error) setErrorMessage(error.message)
        } catch (err: unknown) {
            console.error('Google login network/execution error:', err)
            setErrorMessage('An unexpected error occurred while connecting to Google.')
        }
    }

    const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)
        setErrorMessage(null)
        setSuccessMessage(null) // Clear success message on new attempt

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            })

            if (error) {
                setErrorMessage(error.message)
                setLoading(false)
            } else {
                router.push('/')
                router.refresh()
            }
        } catch (err: unknown) {
            console.error('Login network/execution error:', err)
            setErrorMessage('An unexpected network error occurred. Please try again.')
            setLoading(false)
        }
    }

    // 3. The Forgot Password Logic
    const handleForgotPassword = async (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault() // Stop the page from reloading/jumping
        
        if (!email) {
            setErrorMessage('Please enter your email address first so I know where to send the link!')
            return
        }

        setLoading(true)
        setErrorMessage(null)
        setSuccessMessage(null)

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                // This is where they go after clicking the email link
                redirectTo: `${window.location.origin}/auth/reset-password`,
            })

            if (error) {
                setErrorMessage(error.message)
            } else {
                setSuccessMessage('Check your inbox! I’ve sent a password reset link.')
            }
        } catch (err: unknown) {
            console.error('Password reset network/execution error:', err)
            setErrorMessage('An unexpected error occurred while requesting the reset link.')
        } finally {
            // Moved to a finally block to ensure loading state clears even if a hard error is thrown
            setLoading(false)
        }
    }

    // --- RENDER ---
    return (
        <main className={styles.authContainer} aria-labelledby="login-title">
            {/* --- HEADER --- */}
            <h1 id="login-title" className={styles.title}>Resin Kalaakaari</h1>
            <p className={styles.subtitle}>Welcome back to your sanctuary</p>

            {/* --- OAUTH SECTION --- */}
            <button 
                onClick={handleGoogleLogin} 
                className={styles.googleBtn}
                aria-label="Sign in with Google"
            >
                <img 
                    src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
                    width="18" 
                    alt="Google Provider Logo" 
                    aria-hidden="true" // Hides redundant image announcement from screen readers
                />
                Continue with Google
            </button>

            <div className={styles.divider} aria-hidden="true">
                <span>or</span>
            </div>

            {/* --- EMAIL/PASSWORD FORM --- */}
            <form onSubmit={handleLogin} aria-label="Email and Password Login Form">
                <input
                    id="email"
                    className={styles.inputField}
                    type="email"
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    aria-label="Email address"
                    autoComplete="email"
                />
                <input
                    id="password"
                    className={styles.inputField}
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    aria-label="Password"
                    autoComplete="current-password"
                />

                {/* --- ALERTS & MESSAGES --- */}
                {/* a11y: role="alert" makes screen readers announce the text immediately */}
                {errorMessage && (
                    <p className={styles.errorText} role="alert">
                        {errorMessage}
                    </p>
                )}
                
                {successMessage && (
                    <p style={{ color: '#2ecc71', fontSize: '14px', marginBottom: '10px' }} role="alert">
                        {successMessage}
                    </p>
                )}

                {/* --- SUBMIT ACTIONS --- */}
                <button 
                    type="submit" 
                    disabled={loading} 
                    className={styles.primaryBtn}
                    aria-busy={loading}
                >
                    {loading ? 'Signing in...' : 'Sign In'}
                </button>
            </form>

            {/* --- FOOTER LINKS --- */}
            <p className={styles.footerText}>
                Don't have an account? <Link href="/signup" className={styles.link} aria-label="Sign up for a new account">Sign Up</Link>
            </p>

            <p className={styles.footerText} style={{ marginTop: '10px' }}>
                <button 
                    onClick={handleForgotPassword}
                    className={styles.link} 
                    aria-label="Send a password reset link to your email"
                    style={{ 
                        fontSize: '12px', 
                        opacity: 0.7, 
                        background: 'none', 
                        border: 'none', 
                        cursor: 'pointer',
                        fontFamily: 'inherit' 
                    }}
                >
                    Forgot your password?
                </button>
            </p>
        </main>
    )
}