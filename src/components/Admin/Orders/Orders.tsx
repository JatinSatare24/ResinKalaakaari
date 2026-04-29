"use client"

/**
 * ADMIN ORDERS COMPONENT
 * Manages the store's orders, status updates, and customer transactions.
 * Restricted to the designated Admin UID.
 */

// --- IMPORTS ---
import React, { useEffect, useState, useContext } from "react"
import { useRouter } from "next/navigation"
import { CartContext } from "@/context/CartContext"
import { client } from "@/lib/supabase"
import styles from "@/components/Admin/Orders/Orders.module.css"

// --- INTERFACES ---
export interface AdminOrder {
    id: string;
    created_at: string;
    transaction_id?: string;
    full_name: string;
    total_price: number;
    status: string;
}

// --- COMPONENT ---
export default function AdminOrders() {
    // --- STATE MANAGEMENT ---
    const [orders, setOrders] = useState<AdminOrder[]>([])
    const [orderLoading, setOrderLoading] = useState<boolean>(true)

    // --- CONTEXT & ROUTING ---
    const { user, loading } = useContext(CartContext)!
    const router = useRouter()
    const supabase = client()

    // --- CONSTANTS ---
    const ADMIN_UID = "4779edb2-e2ef-4a1e-8a66-e9bde3344a35".trim()

    // --- LIFECYCLE: SECURITY CHECK ---
    useEffect(() => {
        if (!loading) {
            if (!user || user.id !== ADMIN_UID) {
                router.push('/')
            }
        }
    }, [user, loading, router, ADMIN_UID])

    // --- LIFECYCLE: DATA FETCHING ---
    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const { data, error } = await supabase
                    .from('orders')
                    .select('*')
                    .order('created_at', { ascending: false })

                if (error) throw error
                setOrders(data as AdminOrder[] || [])
            } catch (err: unknown) {
                console.error("Admin fetch error:", err)
            } finally {
                setOrderLoading(false)
            }
        }

        if (user?.id === ADMIN_UID) {
            fetchOrders()
        }
    }, [supabase, user?.id, ADMIN_UID])

    // --- HANDLERS ---
    const updateStatus = async (orderId: string, newStatus: string) => {
        try {
            const { error } = await supabase
                .from('orders')
                .update({ status: newStatus })
                .eq('id', orderId)

            if (error) throw error

            setOrders(prev => prev.map(o =>
                o.id === orderId ? { ...o, status: newStatus } : o
            ))
        } catch (err: unknown) {
            console.error("Status update error:", err)
            alert("Failed to update status. Please check your connection.")
        }
    }

    // --- RENDER GUARDS ---
    if (!user || user.id !== ADMIN_UID) return null
    if (orderLoading) return <div className={styles.loader} role="status">Loading orders...</div>

    // --- RENDER ---
    return (
        <main className={styles.adminWrapper}>
            <h1 className={styles.adminTitle}>Admin: Manage Orders</h1>

            <div className={styles.tableResponsive}>
                <table className={styles.orderTable}>
                    <caption className="sr-only">List of customer orders and payment statuses</caption>

                    {/* --- DESKTOP HEADER --- */}
                    <thead>
                        <tr>
                            <th scope="col">Date</th>
                            <th scope="col">Order ID</th>
                            <th scope="col">Transaction ID</th>
                            <th scope="col">Customer</th>
                            <th scope="col">Total</th>
                            <th scope="col">Status</th>
                            <th scope="col">Action</th>
                        </tr>
                    </thead>

                    {/* --- ORDER LIST --- */}
                    <tbody>
                        {orders.map(order => (
                            <tr key={order.id}>
                                <td data-label="Date">
                                    {new Date(order.created_at).toLocaleDateString('en-IN')}
                                </td>

                                <td data-label="Order ID" className={styles.orderId}>
                                    RK-{order.id.slice(0, 8).toUpperCase()}
                                </td>

                                <td data-label="Transaction ID" className={styles.orderId}>
                                    {order.transaction_id ? order.transaction_id.toUpperCase() : 'N/A'}
                                </td>

                                <td data-label="Customer">
                                    {order.full_name}
                                </td>

                                <td data-label="Total">
                                    ₹{order.total_price}
                                </td>

                                <td data-label="Status">
                                    <span
                                        className={`${styles.badge} ${styles[order.status.toLowerCase()]}`}
                                        aria-label={`Current status: ${order.status.replace('_', ' ')}`}
                                    >
                                        {order.status.replace('_', ' ')}
                                    </span>
                                </td>

                                <td data-label="Action">
                                    <select
                                        value={order.status}
                                        onChange={(e) => updateStatus(order.id, e.target.value)}
                                        className={styles.statusSelect}
                                        aria-label={`Change status for order RK-${order.id.slice(0, 8).toUpperCase()}`}
                                    >
                                        <option value="pending">Pending</option>
                                        <option value="verifying_payment">Verifying Payment</option>
                                        <option value="in-process">In Process</option>
                                        <option value="confirmed">Confirmed</option>
                                        <option value="shipped">Shipped</option>
                                        <option value="delivered">Delivered</option>
                                    </select>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </main>
    )
}