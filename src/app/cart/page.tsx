"use client"

import { useContext } from "react";
import { CartContext } from '@/context/CartContext'
import { products } from "@/data/products";
import CartCard from '@/components/CartCard/CartCard'
import styles from '@/components/CartCard/CartCard.module.css'
import Link from 'next/link'

export default function CartsPage() {

    const { cart, clearCart } = useContext(CartContext)!

    if (cart.length === 0) {
        return <div className={styles.empty}>
            <h2 className={styles.title}>Your cart is empty</h2>
            <p className={styles.subtitle}>
                Looks like you haven’t added anything yet
            </p>

            <Link href='/'>
                <button className={styles.button}>
                    Shop now
                </button>
            </Link>
        </div>

    }

    const grandTotal = cart.reduce((acc, item) => {
        return acc + item.price * item.quantity
    }, 0)

    return (
        <section>
            {cart.map((item) => (
                <CartCard key={item.id} item={item} />
            ))}

            <div className={styles.summary}>
                <div className={styles.totalRow}>
                    <span>Grand Total</span>
                    <span>₹{grandTotal}</span>
                </div>

                <button className={styles.clearBtn} onClick={() => clearCart()}>
                    Clear Cart
                </button>
            </div>
        </section>


    )

}