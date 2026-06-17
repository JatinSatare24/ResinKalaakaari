"use client"

/**
 * CHECKOUT COMPONENT
 * Handles order processing, user address auto-fill, and final payment/submission logic.
 */

// --- IMPORTS ---
import React, { useContext, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { CartContext } from "@/context/CartContext"
import { client } from "@/lib/supabase"
import Loader from '@/components/Spinner/Spinner'
import styles from "@/components/Checkout/Checkout.module.css"

// --- INTERFACES ---
export interface CheckoutFormData {
    fullName: string;
    phone: string;
    address_line: string;
    city: string;
    state: string;
    pincode: string;
}

export interface OrderItem {
    order_id: string;
    product_id: string;
    quantity: number;
    price_at_purchase: number;
}

// --- COMPONENT ---
export default function Checkout() {
    // --- CONTEXT & ROUTING ---
    const context = useContext(CartContext)
    const router = useRouter()
    const supabase = client()

    // --- STATE MANAGEMENT ---
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
    const [orderFinished, setOrderFinished] = useState<boolean>(false)
    const [profileLoading, setProfileLoading] = useState<boolean>(true)

    const [formData, setFormData] = useState<CheckoutFormData>({
        fullName: '',
        phone: '',
        address_line: '',
        city: '',
        state: '',
        pincode: ''
    })

    // --- EARLY CONTEXT GUARD ---
    if (!context) return null
    const { cart, user, clearCart, loading: authLoading } = context

    // --- LIFECYCLE: AUTO-FILL LOGIC ---
    useEffect(() => {
        const fetchSavedAddress = async () => {
            if (!user) {
                setProfileLoading(false)
                return
            }

            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single()

                if (error) throw error

                if (data) {
                    setFormData({
                        fullName: data.full_name || '',
                        phone: data.phone || '',
                        address_line: data.address_line || '',
                        city: data.city || '',
                        state: data.state || '',
                        pincode: data.pincode || ''
                    })
                }
            } catch (err: unknown) {
                console.error("Profile auto-fill failed:", err)
            } finally {
                setProfileLoading(false)
            }
        }

        if (!authLoading) {
            fetchSavedAddress()
        }
    }, [user, authLoading, supabase])

    // --- LIFECYCLE: CART VALIDATION ---
    useEffect(() => {
        if (cart.length === 0 && !isSubmitting && !orderFinished) {
            router.push('/cart')
        }
    }, [cart, isSubmitting, orderFinished, router])

    // --- CALCULATIONS ---
    const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0)
    const shipping = 100
    const grandTotal = subtotal + shipping

    // --- HANDLERS ---
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handlePlaceOrder = async () => {
        // Validation Guard
        if (!formData.fullName || !formData.address_line || !formData.phone || !formData.city || !formData.state || !formData.pincode) {
            alert("Please fill in all shipping details")
            return
        }

        setIsSubmitting(true)

        try {
            // 1. Create the Order Record
            const { data: orderData, error: orderError } = await supabase
                .from('orders')
                .insert([{
                    user_id: user?.id,
                    total_price: grandTotal,
                    full_name: formData.fullName,
                    phone: formData.phone,
                    shipping_address: formData.address_line,
                    city: formData.city,
                    pincode: formData.pincode,
                    state: formData.state,
                    status: 'pending'
                }])
                .select()
                .single()

            if (orderError) throw orderError

            // 2. Prepare and Insert Order Items
            const itemsToInsert: OrderItem[] = cart.map(item => ({
                order_id: orderData.id,
                product_id: item.id,
                quantity: item.quantity,
                price_at_purchase: item.price
            }))

            const { error: itemsError } = await supabase
                .from('order_items')
                .insert(itemsToInsert)

            if (itemsError) throw itemsError

            // 3. Cleanup & Redirect
            setOrderFinished(true);
            await clearCart()
            router.push(`/checkout/success?id=${orderData.id}`);

        } catch (error: unknown) {
            const err = error as Error;
            console.error("Order processing failed:", err.message)
            alert("Something went wrong while placing your order. Please try again.")
        } finally {
            setIsSubmitting(false)
        }
    }

    // --- RENDER GUARDS ---
    if (authLoading || profileLoading) {
        return (
            <div className={styles.pageWrapper} role="status">
                <Loader message={'Loading Checkout'} />
            </div>
        )
    }

    // --- MAIN RENDER ---
    return (
        <div className={styles.pageWrapper}>

            {/* Header Section */}
            <header className={styles.header}>
                <div className={styles.headerContent}>
                    <h1 style={{ fontWeight: 700 }}>Checkout</h1>
                    <Link href="/cart" style={{ fontSize: '14px', color: '#666' }}>
                        Back to Cart
                    </Link>
                </div>
            </header>

            <main className={styles.mainContainer}>
                <div className={styles.checkoutGrid}>

                    {/* LEFT COLUMN: FORM */}
                    <section className={styles.formSection} aria-label="Shipping and Contact Details">

                        {/* Contact Info Card */}
                        <div className={styles.sectionCard}>
                            <h2 className={styles.sectionTitle}>Contact Information</h2>
                            <div className={styles.inputGroup}>
                                <input
                                    type="text"
                                    name="fullName"
                                    aria-label="Full Name"
                                    value={formData.fullName}
                                    onChange={handleChange}
                                    placeholder="Full Name"
                                    className={styles.inputField}
                                    required
                                />
                                <input
                                    type="tel"
                                    name="phone"
                                    aria-label="Phone Number"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    placeholder="Phone Number"
                                    className={styles.inputField}
                                    required
                                />
                            </div>
                        </div>

                        {/* Shipping Info Card */}
                        <div className={styles.sectionCard}>
                            <h2 className={styles.sectionTitle}>Shipping Address</h2>
                            <div className={styles.inputGroup}>
                                <textarea
                                    name="address_line"
                                    aria-label="Street Address"
                                    value={formData.address_line}
                                    onChange={handleChange}
                                    placeholder="Full Address (House No, Building, Street)"
                                    rows={3}
                                    className={styles.inputField}
                                    required
                                />
                                <div className={styles.rowInputs}>
                                    <input
                                        type="text"
                                        name="city"
                                        aria-label="City"
                                        value={formData.city}
                                        onChange={handleChange}
                                        placeholder="City"
                                        className={styles.inputField}
                                        required
                                    />
                                    <input
                                        type="text"
                                        name="state"
                                        aria-label="State"
                                        value={formData.state}
                                        onChange={handleChange}
                                        placeholder="State"
                                        className={styles.inputField}
                                        required
                                    />
                                    <input
                                        type="text"
                                        name="pincode"
                                        aria-label="Pincode"
                                        value={formData.pincode}
                                        onChange={handleChange}
                                        placeholder="Pincode"
                                        className={styles.inputField}
                                        required
                                    />
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* RIGHT COLUMN: SUMMARY */}
                    <aside className={styles.summarySection} aria-label="Order Summary">
                        <div className={`${styles.sectionCard} ${styles.stickySummary}`}>
                            <h2 className={styles.sectionTitle}>Order Summary</h2>

                            <div className={styles.summaryRow}>
                                <span>Subtotal ({cart.length} items)</span>
                                <span>₹{subtotal}</span>
                            </div>
                            <div className={styles.summaryRow}>
                                <span>Shipping</span>
                                <span>₹{shipping}</span>
                            </div>

                            <div className={styles.grandTotalRow} aria-label={`Grand Total: ₹${grandTotal}`}>
                                <span>Grand Total</span>
                                <span>₹{grandTotal}</span>
                            </div>

                            <button
                                type="button"
                                onClick={handlePlaceOrder}
                                disabled={isSubmitting}
                                className={styles.placeOrderBtn}
                                aria-busy={isSubmitting}
                                style={{ opacity: isSubmitting ? 0.7 : 1 }}
                            >
                                {isSubmitting ? "Processing..." : "Place Order"}
                            </button>
                        </div>
                    </aside>

                </div>
            </main>
        </div>
    )
}