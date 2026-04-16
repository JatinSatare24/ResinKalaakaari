'use client'

import { useState } from 'react'
import { client } from '@/lib/supabase'
import styles from '@/components/Login/Login.module.css'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)

    const supabase = client()
    const router = useRouter()

    // 1. Google OAuth (Stays the same - it's a great fast-path!)
    const handleGoogleLogin = async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
            },
        })
        if (error) setErrorMessage(error.message)
    }

    // 2. The Traditional Password Login
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setErrorMessage(null)

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        if (error) {
            setErrorMessage(error.message)
            setLoading(false)
        } else {
            // Success! Send them to the home page or wherever they were going
            router.push('/')
            router.refresh() // Ensures the auth state updates across the app
        }
    }

    return (
        <div className={styles.authContainer}>
            <h1 className={styles.title}>Resin Kalaakaari</h1>
            <p className={styles.subtitle}>Welcome back to your sanctuary</p>

            <button onClick={handleGoogleLogin} className={styles.googleBtn}>
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width="18" alt="G" />
                Continue with Google
            </button>

            <div className={styles.divider}>
                <span>or</span>
            </div>

            <form onSubmit={handleLogin}>
                <input
                    className={styles.inputField}
                    type="email"
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />
                <input
                    className={styles.inputField}
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />

                {errorMessage && <p className={styles.errorText}>{errorMessage}</p>}

                <button type="submit" disabled={loading} className={styles.primaryBtn}>
                    {loading ? 'Signing in...' : 'Sign In'}
                </button>
            </form>

            <p className={styles.footerText}>
                Don't have an account? <Link href="/signup" className={styles.link}>Sign Up</Link>
            </p>

            {/* Optional: Add a "Forgot Password" link later if you want to be extra fancy */}
            <p className={styles.footerText} style={{ marginTop: '10px' }}>
                <Link href="#" className={styles.link} style={{ fontSize: '12px', opacity: 0.7 }}>
                    Forgot your password?
                </Link>
            </p>
        </div>
    )
}