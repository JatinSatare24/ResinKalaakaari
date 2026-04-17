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

   