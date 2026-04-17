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

   