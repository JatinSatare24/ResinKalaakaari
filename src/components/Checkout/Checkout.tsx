"use client"

import { useContext, useState, useEffect } from "react"
import { CartContext } from "@/context/CartContext"
import { useRouter } from "next/navigation"
import { client } from "@/lib/supabase"
import Link from "next/link"
import styles from "@/components/Checkout/Checkout.module.css"

export default function Checkout() {
    const context = useContext(CartContext)
    const router = useRouter()
    const supabase = client()

    const [isSubmitting, setIsSubmitting] = useState(false)
    const [orderFinished, setOrderFinished] = useState(false)
    const [profileLoading, setProfileLoading] = useState(true) // NEW: Track profile fetch

    // Standardized fields to match your Profile page + state
    const [formData, setFormData] = useState({
        fullName: '',
        phone: '',
        address_line: '',
        city: '',
        state: '', 
        pincode: ''
    })

    if (!context) return null
    const { cart, user, clearCart, loading: authLoading } = context

    // 1. AUTO-FILL LOGIC: Fetch profile when user is loaded
    useEffect(() => {
        const fetchSavedAddress = async () => {
            if (!user) {
                setProfileLoading(false)
                return
            }

            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single()

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
            setProfileLoading(false)
        }

        if (!authLoading) {
            fetchSavedAddress()
        }
    }, [user, authLoading, supabase])

    // Redirect if cart is empty
    useEffect(() => {
        if (cart.length === 0 && !isSubmitting && !orderFinished) {
            router.push('/cart')
        }
    }, [cart, isSubmitting, orderFinished, router])

    const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0)
    const shipping = 100
    const grandTotal = subtotal + shipping

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handlePlaceOrder = async () => {
        if (!formData.fullName || !formData.address_line || !formData.phone || !formData.state || !formData.pincode) {
            alert("Please fill in all shipping details")
            return
        }

        setIsSubmitting(true)

        try {
            // Insert using the mapped names
            const { data: orderData, error: orderError } = await supabase
                .from('orders')
                .insert([{
                    user_id: user.id,
                    total_price: grandTotal,
                    full_name: formData.fullName,
                    phone: formData.phone,
                    shipping_address: formData.address_line,
                    city: formData.city,
                    pincode: formData.pincode,
                    state: formData.state, // Pass the state to orders too
                    status: 'pending'
                }])
                .select()
                .single()

            if (orderError) throw orderError

            const itemsToInsert = cart.map(item => ({
                order_id: orderData.id,
                product_id: item.id,
                quantity: item.quantity,
                price_at_purchase: item.price
            }))

            const { error: itemsError } = await supabase
                .from('order_items')
                .insert(itemsToInsert)

            if (itemsError) throw itemsError

            setOrderFinished(true);
            await clearCart()
            router.push(`/checkout/success?id=${orderData.id}`);

        } catch (error: any) {
            console.error("Order error:", error.message)
            alert("Something went wrong. Please try again.")
        } finally {
            setIsSubmitting(false)
        }
    }

    // Stop the whole page from "flickering" while we check for the user's profile
    if (authLoading || profileLoading) return <div className={styles.pageWrapper}><p>Preparing your checkout...</p></div>

    return (
        <div className={styles.pageWrapper}>
            <header className={styles.header}>
                <div className={styles.headerContent}>
                    <h1 style={{ fontWeight: 700 }}>Checkout</h1>
                    <Link href="/cart" style={{ fontSize: '14px', color: '#666' }}>Back to Cart</Link>
                </div>
            </header>

            <main className={styles.mainContainer}>
                <div className={styles.checkoutGrid}>

                    {/* LEFT COLUMN: FORM */}
                    <div className={styles.formSection}>
                        <div className={styles.sectionCard}>
                            <h2 className={styles.sectionTitle}>Contact Information</h2>
                            <div className={styles.inputGroup}>
                                <input
                                    type="text"
                                    name="fullName"
                                    value={formData.fullName}
                                    onChange={handleChange}
                                    placeholder="Full Name"
                                    className={styles.inputField}
                                />
                                <input
                                    type="tel"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    placeholder="Phone Number"
                                    className={styles.inputField}
                                />
                            </div>
                        </div>

                        <div className={styles.sectionCard}>
                            <h2 className={styles.sectionTitle}>Shipping Address</h2>
                            <div className={styles.inputGroup}>
                                <textarea
                                    name="address"
                                    value={formData.address_line}
                                    onChange={handleChange}
                                    placeholder="Full Address (House No, Building, Street)"
                                    rows={3}
                                    className={styles.inputField}
                                />
                                <div className={styles.rowInputs}>
                                    <input
                                        type="text"
                                        name="city"
                                        value={formData.city}
                                        onChange={handleChange}
                                        placeholder="City"
                                        className={styles.inputField}
                                    />
                                    <input
                                        type="text"
                                        name="state"
                                        value={formData.state}
                                        onChange={handleChange}
                                        placeholder="state"
                                        className={styles.inputField}
                                    />
                                    <input
                                        type="text"
                                        name="pincode"
                                        value={formData.pincode}
                                        onChange={handleChange}
                                        placeholder="Pincode"
                                        className={styles.inputField}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: SUMMARY */}
                    <div className={styles.summarySection}>
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

                            <div className={styles.grandTotalRow}>
                                <span>Grand Total</span>
                                <span>₹{grandTotal}</span>
                            </div>

                            <button
                                onClick={handlePlaceOrder}
                                disabled={isSubmitting}
                                className={styles.placeOrderBtn}
                                style={{ opacity: isSubmitting ? 0.7 : 1 }}
                            >
                                {isSubmitting ? "Processing..." : "Place Order"}
                            </button>
                        </div>
                    </div>

                </div>
            </main>
        </div>
    )
}