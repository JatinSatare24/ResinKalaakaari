"use client"

// --- IMPORTS ---
import React, { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { client } from "@/lib/supabase"
import Loader from '@/components/Spinner/Spinner'
import styles from "./MyOrderDetail.module.css"

// --- INTERFACES ---
export interface OrderProduct {
    name: string;
    image_url: string;
}

export interface OrderItem {
    id: string;
    quantity: number;
    price_at_purchase: number;
    products: OrderProduct; // Nested join data
}

export interface Order {
    id: string;
    status: string;
    full_name: string;
    shipping_address: string;
    city: string;
    state: string;
    pincode: string;
    phone: string;
    total_price: number;
    order_items: OrderItem[]; // Array of nested order items
}

// --- COMPONENT ---
export default function MyOrderDetail() {
    // --- STATE & ROUTING ---
    const { id } = useParams()
    const [order, setOrder] = useState<Order | null>(null)
    const [loading, setLoading] = useState<boolean>(true)
    const supabase = client()

    // --- DATA FETCHING & LIFECYCLE ---
    useEffect(() => {
        const fetchFullOrder = async () => {
            try {
                const { data, error } = await supabase
                    .from('orders')
                    .select(`
                        *,
                        order_items (
                            *,
                            products (name, image_url)
                        )
                    `)
                    .eq('id', id)
                    .single()

                if (error) {
                    throw error; // Throw to the catch block for centralized handling
                }

                if (data) {
                    setOrder(data as Order)
                }
            } catch (err: unknown) {
                console.error("Failed to fetch full order details:", err)
            } finally {
                // Ensure loading state is cleared regardless of success or failure
                setLoading(false)
            }
        }

        if (id) {
            fetchFullOrder()
        }
    }, [id, supabase])

    // --- RENDER GUARDS ---
    if (loading) return <Loader message={'Loading your order details'} />
    if (!order) return <p role="alert">Order not found.</p>

    // --- MAIN RENDER ---
    return (
        <main className={styles.container} aria-labelledby="order-title">
            {/* --- HEADER SECTION --- */}
            <header className={styles.header}>
                <h1 id="order-title">Order #{order.id.slice(0, 8).toUpperCase()}</h1>
                <span
                    className={styles.statusBadge}
                    data-status={order.status}
                    aria-label={`Order status: ${order.status}`}
                >
                    {order.status}
                </span>
            </header>

            {/* --- CONTENT GRID --- */}
            <div className={styles.grid}>

                {/* --- LEFT: ITEMS LIST --- */}
                <section className={styles.itemsSection} aria-labelledby="items-heading">
                    <h3 id="items-heading">Items in your order</h3>

                    {order.order_items.map((item: OrderItem) => (
                        <article key={item.id} className={styles.itemCard}>
                            <img
                                src={item.products.image_url}
                                alt={`Product image for ${item.products.name}`}
                                loading="lazy"
                            />
                            <div className={styles.itemInfo}>
                                <h4>{item.products.name}</h4>
                                <p>Qty: {item.quantity}</p>
                                <p className={styles.price}>₹{item.price_at_purchase}</p>
                            </div>
                        </article>
                    ))}
                </section>

                {/* --- RIGHT: SUMMARY & SHIPPING --- */}
                <aside className={styles.summarySection} aria-label="Order Summary and Shipping Details">

                    {/* Shipping Address Card */}
                    <div className={styles.card}>
                        <h3>Shipping Address</h3>
                        <address style={{ fontStyle: 'normal' }}>
                            <p>{order.full_name}</p>
                            <p>{order.shipping_address}</p>
                            <p>{order.city}, {order.state} - {order.pincode}</p>
                            <p>Phone: {order.phone}</p>
                        </address>
                    </div>

                    {/* Cost Summary Card */}
                    <div className={styles.card}>
                        <h3>Order Summary</h3>
                        <div className={styles.row}>
                            <span>Subtotal</span>
                            <span>₹{order.total_price - 100}</span>
                        </div>
                        <div className={styles.row}>
                            <span>Shipping</span>
                            <span>₹100</span>
                        </div>
                        <div className={`${styles.row} ${styles.total}`}>
                            <span>Total</span>
                            <span>₹{order.total_price}</span>
                        </div>
                    </div>

                </aside>
            </div>
        </main>
    )
}