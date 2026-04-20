import styles from '@/components/CartCard/CartCard.module.css'
import { CartContext } from "@/context/CartContext"
import { useContext } from "react"

export default function CartCard({ item }: any) {

    const { removeFromCart, updateQuantity } = useContext(CartContext)!

    return (

        <div className={styles.card}>
            <div>
                <img
                    src={item.image_url}
                    alt={item.name}
                    className={styles.image}
                />
            </div>


            <div className={styles.content}>
                <h2 className={styles.name}>{item.name}</h2>
                <p className={styles.price}>₹{item.price}</p>

                <div className={styles.controls}>
                    <button onClick={() => updateQuantity(item.id, -1)} className={styles.controlButton}>-</button>
                    <span>{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, +1)} className={styles.controlButton}>+</button>
                </div>

                <p className={styles.total}>
                    Total: ₹{item.price * item.quantity}
                </p>
            </div >

            <button
                className={styles.remove}
                onClick={() => removeFromCart(item.id)}
            >
                ✕
            </button>

        </div >

    )
}