"use client"

// --- IMPORTS ---
import React, { useEffect, useState, useContext, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { FiSmartphone, FiCopy, FiCheckCircle } from "react-icons/fi"
import { CartContext } from "@/context/CartContext"
import { client } from "@/lib/supabase"
import styles from "@/components/Success/Success.module.css"

// --- NEW IMPORTS ---
import Confetti from 'react-confetti'
import { useWindowSize } from 'react-use'

// --- INTERFACES ---
export interface OrderData {
    id: string;
    total_price: number;
    status: string;
    transaction_id?: string;
}

function SuccessContent() {
    const { width, height } = useWindowSize() // Get screen dimensions
    const searchParams = useSearchParams()
    const orderId = searchParams.get('id')
    const router = useRouter()
    const { user, loading: authLoading } = useContext(CartContext)!

    const [verifying, setVerifying] = useState<boolean>(true)
    const [orderData, setOrderData] = useState<OrderData | null>(null)
    const [utr, setUtr] = useState<string>("")
    const [submitting, setSubmitting] = useState<boolean>(false)
    const [paymentSubmitted, setPaymentSubmitted] = useState<boolean>(false)
    const [showConfetti, setShowConfetti] = useState<boolean>(false) // Control for the rain

    const supabase = client()
    const SANIKA_UPI_ID = "9175461840@ibl"
    const PHONE_NUMBER = "919022223759"

    useEffect(() => {
        const verifyOrder = async () => {
            if (!orderId) {
                router.push('/')
                return
            }
            if (authLoading) return
            if (!user) {
                router.push('/login')
                return
            }

            try {
                const { data, error } = await supabase
                    .from('orders')
                    .select('id, total_price, status, transaction_id')
                    .eq('id', orderId)
                    .eq('user_id', user.id)
                    .single()

                if (error || !data) {
                    router.push('/')
                } else {
                    setOrderData(data as OrderData)
                    if (data.transaction_id) setPaymentSubmitted(true)
                }
            } catch (err: unknown) {
                console.error("Order verification exception:", err)
                router.push('/')
            } finally {
                setVerifying(false)
            }
        }

        verifyOrder()
    }, [orderId, user, authLoading, router, supabase])

    const handleConfirmPayment = async () => {
        if (utr.length < 12) {
            alert("Please enter a valid 12-digit UTR/Transaction ID")
            return
        }

        setSubmitting(true)
        try {
            const { error } = await supabase
                .from('orders')
                .update({
                    transaction_id: utr,
                    status: 'verifying_payment'
                })
                .eq('id', orderId)

            if (!error) {
                setPaymentSubmitted(true)
                setShowConfetti(true) // Start the rain!
            } else {
                throw error
            }
        } catch (err: unknown) {
            console.error("Payment confirmation error:", err)
            alert("Error submitting details. Please try again.")
        } finally {
            setSubmitting(false)
        }
    }

    const handleWhatsAppRedirect = () => {
        const message = encodeURIComponent(
            `Hi Sanika! I just placed order #${orderId}. I've paid ₹${orderData?.total_price} via UPI. Here is my screenshot!`
        )
        window.open(`https://wa.me/${PHONE_NUMBER}?text=${message}`, "_blank")
    }

    const handleCopyUPI = () => {
        navigator.clipboard.writeText(SANIKA_UPI_ID)
    }

    if (authLoading || verifying) {
        return <div className={styles.center} aria-live="polite">Verifying your order...</div>
    }

    const upiLink = `upi://pay?pa=${SANIKA_UPI_ID}&pn=ResinKalaakaari&am=${orderData?.total_price}&cu=INR&tn=Order_${orderId?.slice(0, 8)}`

    return (
        <main className={styles.container}>
            {/* --- CONFETTI RAIN --- */}
            {showConfetti && (
                <Confetti
                    width={width}
                    height={height}
                    recycle={false} // Stops raining after one burst
                    numberOfPieces={1000}
                    gravity={0.1} // Slower, more elegant fall
                    // colors={['#D4AF37', '#1A1A1A', '#F8F9FA']} // Gold, Black, White
                />
            )}

            <div className={styles.card} aria-labelledby="success-title">
                {!paymentSubmitted ? (
                    <>
                        <div className={styles.icon} aria-hidden="true">🎨</div>
                        <h1 id="success-title" className={styles.title}>Almost Done!</h1>
                        <p className={styles.message}>
                            To keep our art affordable, we accept direct UPI payments. Please complete your payment of <strong>₹{orderData?.total_price}</strong>.
                        </p>

                        <section className={styles.paymentBox} aria-label="UPI Payment Options">
                            <a href={upiLink} className={styles.upiBtn}>
                                <FiSmartphone aria-hidden="true" /> Pay via GPay / PhonePe / Paytm
                            </a>

                            <div className={styles.divider} aria-hidden="true">
                                <span>OR SCAN / USE ID</span>
                            </div>

                            <div className={styles.upiIdRow}>
                                <code aria-label="UPI ID">{SANIKA_UPI_ID}</code>
                                <button onClick={handleCopyUPI} title="Copy UPI ID" aria-label="Copy UPI ID to clipboard">
                                    <FiCopy aria-hidden="true" />
                                </button>
                            </div>
                        </section>

                        <section className={styles.verificationSection} aria-labelledby="proof-heading">
                            <h3 id="proof-heading">Submit Payment Proof</h3>
                            <input
                                type="text"
                                placeholder="Enter 12-digit UTR / Transaction ID"
                                value={utr.toUpperCase()}
                                onChange={(e) => setUtr(e.target.value)}
                                className={styles.utrInput}
                                maxLength={12}
                                aria-label="Enter 12-digit UTR or Transaction ID"
                            />
                            <button
                                onClick={handleConfirmPayment}
                                className={styles.confirmBtn}
                                disabled={submitting}
                                aria-busy={submitting}
                            >
                                {submitting ? "Submitting..." : "Confirm Payment"}
                            </button>
                        </section>
                    </>
                ) : (
                    <div role="alert" aria-live="assertive">
                        <div className={styles.icon} style={{ color: '#10b981' }} aria-hidden="true">
                            <FiCheckCircle size={50} />
                        </div>
                        <h1 className={styles.title}>Payment Received!</h1>
                        <p className={styles.message}>
                            Thank you! Sanika will verify your transaction (ID: {utr || orderData?.transaction_id}) and update your order status within 24 hours.
                        </p>
                    </div>
                )}

                <div className={styles.actions}>
                    <button onClick={handleWhatsAppRedirect} className={styles.whatsappBtn}>
                        Share Screenshot on WhatsApp
                    </button>
                    <Link href="/my-orders" className={styles.homeBtn}>
                        View My Orders
                    </Link>
                </div>
            </div>
        </main>
    )
}

export default function Success() {
    return (
        <Suspense fallback={<div className={styles.center} aria-live="polite">Loading checkout details...</div>}>
            <SuccessContent />
        </Suspense>
    )
}