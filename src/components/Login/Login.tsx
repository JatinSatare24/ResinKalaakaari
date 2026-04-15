'use client'

import { useState } from 'react'
import { client } from '@/lib/supabase' // Your unified client
import styles from '@/components/Login/Login.module.css'
import Link from 'next/link'

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [otp, setOtp] = useState('')
    const [loading, setLoading] = useState(false)
    const [showOtpInput, setShowOtpInput] = useState(false)

    const supabase = client()

    // 1. Google OAuth Logic
    const handleGoogleLogin = async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
            },
        })
        if (error) console.error("Google Login Error:", error.message)
    }

    // 2. Step One: Send 6-digit Code
    const handleSendOtp = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: {
                shouldCreateUser: true,
                // We point this to our callback for users who click the link instead of typing the code
                emailRedirectTo: `${window.location.origin}/auth/callback`,
            },
        })
        setLoading(false)
        if (!error) {
            setShowOtpInput(true)
        } else {
            alert(error.message)
        }
    }

    // 3. Step Two: Verify the Code
    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        const { error } = await supabase.auth.verifyOtp({
            email,
            token: otp,
            type: 'email',
        })
        setLoading(false)
        if (!error) {
            window.location.href = '/' 
        } else {
            alert(error.message)
        }
    }

    return (
        <div className={styles.authContainer}>
            <h1 className={styles.title}>Resin Kalaakaari</h1>
            <p className={styles.subtitle}>Sign in to your artistic sanctuary</p>

            <button onClick={handleGoogleLogin} className={styles.googleBtn}>
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width="18" alt="G" />
                Continue with Google
            </button>

            <div className={styles.divider}>
                <span>or</span>
            </div>

            {!showOtpInput ? (
                <>
                    <form onSubmit={handleSendOtp}>
                        <input
                            className={styles.inputField}
                            type="email"
                            placeholder="Enter your email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                        <button type="submit" disabled={loading} className={styles.primaryBtn}>
                            {loading ? 'Sending...' : 'Send Login Code'}
                        </button>
                    </form>
                    <p className={styles.footerText}>
                        Don't have an account? <Link href="/signup" className={styles.link}>Sign Up</Link>
                    </p>
                </>
            ) : (
                <form onSubmit={handleVerifyOtp}>
                    <p className={styles.subtitle}>Check your email for the 6-digit code</p>
                    <input
                        className={styles.inputField}
                        type="text"
                        placeholder="000000"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        maxLength={6}
                        required
                    />
                    <button type="submit" disabled={loading} className={styles.primaryBtn}>
                        {loading ? 'Verifying...' : 'Verify & Login'}
                    </button>
                    <button
                        type="button"
                        onClick={() => setShowOtpInput(false)}
                        className={styles.secondaryBtn}
                    >
                        Change Email
                    </button>
                </form>
            )}
        </div>
    )
}