'use client'

// --- IMPORTS ---
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { client } from '@/lib/supabase'
import styles from '@/components/Login/Login.module.css'

// --- INTERFACES ---
export interface ResetPasswordProps {
    // Interface established for future scalability (e.g., passing custom redirect paths)
}

// --- COMPONENT ---
export default function ResetPassword(props: ResetPasswordProps) {
    // --- STATE ---
    const [password, setPassword] = useState<string>('')
    const [confirmPassword, setConfirmPassword] = useState<string>('')
    const [loading, setLoading] = useState<boolean>(false)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const [success, setSuccess] = useState<boolean>(false)

    // --- UTILS ---
    const supabase = client()
    const router = useRouter()

    // --- HANDLERS ---
    const handleUpdatePassword = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()

        // Validation Logic
        if (password !== confirmPassword) {
            setErrorMessage("Passwords don't match!")
            return
        }

        setLoading(true)
        setErrorMessage(null)

        try {
            // Supabase Password Update
            const { error } = await supabase.auth.updateUser({
                password: password
            })

            if (error) {
                setErrorMessage(error.message)
                setLoading(false)
            } else {
                setSuccess(true)

                // Wait 2 seconds so they can see the success message, then redirect
                setTimeout(() => {
                    router.push('/login')
                }, 2000)
            }
        } catch (err: unknown) {
            console.error("Password update unexpected error:", err)
            setErrorMessage("An unexpected network error occurred. Please try again.")
            setLoading(false)
        }
    }

    // --- RENDER ---
    return (
        <main className={styles.authContainer} aria-labelledby="reset-title">
            <h1 id="reset-title" className={styles.title}>New Password</h1>
            <p className={styles.subtitle}>Enter your new sanctuary key</p>

            {/* --- CONDITIONAL VIEWS --- */}
            {success ? (
                <div
                    style={{ textAlign: 'center' }}
                    role="alert"
                    aria-live="assertive"
                >
                    <p style={{ color: '#2ecc71', marginBottom: '20px' }}>
                        Password updated successfully! Redirecting you to login...
                    </p>
                </div>
            ) : (
                <form
                    onSubmit={handleUpdatePassword}
                    aria-label="Password reset form"
                >
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
                        {loading ? 'Updating...' : 'Update Password'}
                    </button>
                </form>
            )}
        </main>
    )
}