"use client"

// --- IMPORTS ---
import React, { useEffect, useState, useContext } from "react"
import { useRouter } from "next/navigation"
import { CartContext } from "@/context/CartContext"
import { client } from "@/lib/supabase"
import Loader from '@/components/Spinner/Spinner'
import styles from "@/components/MyOrders/MyOrders.module.css"

// --- INTERFACES ---
export interface OrderItemAggregate {
    count: number;
}

export interface OrderSummary {
    id: string;
    created_at: string;
    total_price: number;
    status: string;
    order_items: OrderItemAggregate[];
    user_id?: string;
}

// --- COMPONENT ---
export default function MyOrders() {
    // --- STATE & CONTEXT ---
    const router = useRouter()
    const { user, loading: authLoading } = useContext(CartContext)!
    const [orders, setOrders] = useState<OrderSummary[]>([])
    const [loading, setLoading] = useState<boolean>(true)
    const supabase = client()

    // --- DATA FETCHING & LIFECYCLE ---
    useEffect(() => {
        const handleNavigation = async () => {
            // 1. Wait for Auth to figure out who is here
            if (authLoading) return;

            // 2. If it's a Guest, stop them here and send them to Login
            if (!user) {
                router.push('/login');
                // We don't even need to set loading to false because 
                // the user is being whisked away to a different page.
                return;
            }

            // 3. If it's a User, get their data
            try {
                const { data, error } = await supabase
                    .from('orders')
                    .select(`*, order_items (count)`)
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false });

                if (error) {
                    throw error;
                }
                setOrders(data as OrderSummary[] || []);
            } catch (err: unknown) {
                console.error("Error fetching user orders:", err);
            } finally {
                // 4. No matter what happened with the fetch, stop the spinner
                setLoading(false);
            }
        }

        handleNavigation();
    }, [user, authLoading, router, supabase]);

    // --- RENDER GUARDS ---
    if (authLoading || loading) return <Loader message={'Loading your orders'} />

    if (orders.length === 0) {
        return (
            <div className={styles.emptyState} aria-live="polite">
                <h2>No orders yet!</h2>
                <p>Your artistic sanctuary is waiting for its first piece.</p>
                <button
                    onClick={() => router.push('/')}
                    aria-label="Start shopping for resin art"
                >
                    Start Shopping
                </button>
            </div>
        )
    }

    // --- MAIN RENDER ---
    return (
        <main className={styles.container} aria-labelledby="my-orders-title">
            <h1 id="my-orders-title" className={styles.title}>My Orders</h1>

            <section className={styles.orderList} aria-label="List of your past orders">
                {orders.map((order) => (
                    <article key={order.id} className={styles.orderCard}>

                        {/* --- CARD HEADER --- */}
                        <header className={styles.cardHeader}>
                            <div>
                                <span className={styles.label}>ORDER PLACED</span>
                                <p>{new Date(order.created_at).toLocaleDateString()}</p>
                            </div>
                            <div>
                                <span className={styles.label}>TOTAL</span>
                                <p>₹{order.total_price}</p>
                            </div>
                            <div
                                className={styles.statusBadge}
                                data-status={order.status}
                                aria-label={`Order status: ${order.status}`}
                            >
                                {order.status.toUpperCase()}
                            </div>
                        </header>

                        {/* --- CARD BODY --- */}
                        <div className={styles.cardBody}>
                            <p>Order ID: #{order.id.slice(0, 8).toUpperCase()}</p>
                            <p>{order.order_items[0]?.count || 0} items in this order</p>
                            <button
                                className={styles.detailsBtn}
                                onClick={() => router.push(`/my-orders/${order.id}`)}
                                aria-label={`View details for Order ID ${order.id.slice(0, 8).toUpperCase()}`}
                            >
                                View Details
                            </button>
                        </div>

                    </article>
                ))}
            </section>
        </main>
    )
}