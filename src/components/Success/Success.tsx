"use client"

import { useEffect, useState, useContext } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { CartContext } from "@/context/CartContext"
import { client } from "@/lib/supabase"
import Link from "next/link"
import { FiSmartphone, FiCopy, FiCheckCircle } from "react-icons/fi"
import styles from "@/components/Success/Success.module.css"

export default function Success() {
    const searchParams = useSearchParams()
    const orderId = searchParams.get('id')
    const router = useRouter()
    const { user, loading: authLoading } = useContext(CartContext)!
    
    const [verifying, setVerifying] = useState(true)
    const [orderData, setOrderData] = useState<any>(null)
    const [utr, setUtr] = useState("")
    const [submitting, setSubmitting] = useState(false)
    const [paymentSubmitted, setPaymentSubmitted] = useState(false)
    
    const supabase = client()

    // Configuration
    const SANIKA_UPI_ID = "sanika@upi" // Replace with actual UPI ID
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

            // Fetch order + total_price to show on this page
            const { data, error } = await supabase
                .from('orders')
                .select('id, total_price, status, transaction_id')
                .eq('id', orderId)
                .eq('user_id', user.id)
                .single()

            if (error || !data) {
                router.push('/')
            } else {
                setOrderData(data)
                // If they already submitted a UTR, show the success state
                if (data.transaction_id) setPaymentSubmitted(true)
            }
            setVerifying(false)
        }

        verifyOrder()
    }, [orderId, user, authLoading, router, supabase])

    const handleConfirmPayment = async () => {
        if (utr.length < 12) {
            alert("Please enter a valid 12-digit UTR/Transaction ID")
            return
        }
        
        setSubmitting(true)
        const { error } = await supabase
            .from('orders')
            .update({ 
                transaction_id: utr, 
                status: 'verifying_payment' 
            })
            .eq('id', orderId)

        if (!error) {
            setPaymentSubmitted(true)
        } else {
            alert("Error submitting details. Please try again.")
        }
        setSubmitting(false)
    }

    const handleWhatsAppRedirect = () => {
        const message = encodeURIComponent(
            `Hi Sanika! I just placed order #${orderId?.slice(0,8)}. I've paid ₹${orderData?.total_price} via UPI. Here is my screenshot! ✨`
        )
        window.open(`https://wa.me/${PHONE_NUMBER}?text=${message}`, "_blank")
    }

    if (authLoading || verifying) {
        return <div className={styles.center}>Verifying your order...</div>
    }

    // UPI Link for Mobile
    const upiLink = `upi://pay?pa=${SANIKA_UPI_ID}&pn=ResinKalaakaari&am=${orderData?.total_price}&cu=INR&tn=Order_${orderId?.slice(0,8)}`

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                {!paymentSubmitted ? (
                    <>
                        <div className={styles.icon}>🎨</div>
                        <h1 className={styles.title}>Almost Done!</h1>
                        <p className={styles.message}>
                            To keep our art affordable, we accept direct UPI payments. Please complete your payment of <strong>₹{orderData?.total_price}</strong>.
                        </p>

                        <div className={styles.paymentBox}>
                            {/* Mobile: Direct App Opener */}
                            <a href={upiLink} className={styles.upiBtn}>
                                <FiSmartphone /> Pay via GPay / PhonePe / Paytm
                            </a>

                            <div className={styles.divider}><span>OR SCAN / USE ID</span></div>
                            
                            <div className={styles.upiIdRow}>
                                <code>{SANIKA_UPI_ID}</code>
                                <button onClick={() => navigator.clipboard.writeText(SANIKA_UPI_ID)} title="Copy ID">
                                    <FiCopy />
                                </button>
                            </div>
                        </div>

                        <div className={styles.verificationSection}>
                            <h3>Submit Payment Proof</h3>
                            <input 
                                type="text" 
                                placeholder="Enter 12-digit UTR / Transaction ID" 
                                value={utr}
                                onChange={(e) => setUtr(e.target.value)}
                                className={styles.utrInput}
                                maxLength={12}
                            />
                            <button 
                                onClick={handleConfirmPayment} 
                                className={styles.confirmBtn}
                                disabled={submitting}
                            >
                                {submitting ? "Submitting..." : "Confirm Payment"}
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        <div className={styles.icon} style={{color: '#10b981'}}><FiCheckCircle size={50} /></div>
                        <h1 className={styles.title}>Payment Received!</h1>
                        <p className={styles.message}>
                            Thank you! Sanika will verify your transaction (ID: {utr || orderData?.transaction_id}) and update your order status within 24 hours.
                        </p>
                    </>
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
        </div>
    )
}