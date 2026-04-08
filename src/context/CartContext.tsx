"use client"

import { useState, createContext, useEffect, useRef } from "react";

export type CartItem = {
    id: number
    name: string
    price: number
    image: string
    quantity: number
}


type CartContextType = {
    cart: CartItem[]
    setCart: React.Dispatch<React.SetStateAction<CartItem[]>>
    addToCart: (product: any) => void
    removeFromCart: (id: number) => void
    updateQuantity: (id: number, value: number) => void
    clearCart: () => void
}

export const CartContext = createContext<CartContextType | null>(null)

export default function CartProvider({ children }: any) {

    const [cart, setCart] = useState<CartItem[]>([])

    const isCartLoaded = useRef(false)
    console.log('isCartLoaded: ', isCartLoaded.current)

    console.log(cart)

    useEffect(() => {

        const persistData = localStorage.getItem('cart')

        if (persistData) {
            setCart(JSON.parse(persistData))
        }

        isCartLoaded.current = true

    }, [])

    useEffect(() => {

        if (!isCartLoaded.current) return
        localStorage.setItem('cart', JSON.stringify(cart))

    }, [cart])

    const addToCart = (product: any) => {

        const productInCart = cart.find(c => c.id === product.id)

        if (productInCart) {
            setCart(prev =>
                prev.map(p =>
                    p.id === product.id
                        ? { ...p, quantity: p.quantity + 1 }
                        : p
                )
            )
        } else {
            setCart(prev => [...prev, { ...product, quantity: 1 }])
        }

    }

    const removeFromCart = (id: number) => {
        setCart(prev => {
            return prev.filter(item => item.id !== id)
        })
    }

    const updateQuantity = (id: number, value: number) => {

        setCart(prev => (
            prev.map(item => {
                if (item.id === id) {
                    return {
                        ...item,
                        quantity: item.quantity + value
                    }
                } else {
                    return item
                }
            }).filter(item => item.quantity > 0)
        ))

    }
    const clearCart = () => {
        setCart([])
    }

    return (
        <CartContext.Provider value={{ cart, setCart, addToCart, removeFromCart, updateQuantity, clearCart }}>
            {children}
        </CartContext.Provider>

    )
}