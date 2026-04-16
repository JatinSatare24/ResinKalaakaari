"use client"

import { useState, createContext, useEffect, useRef } from "react";
import { client } from "@/lib/supabase";

export type CartItem = {
    id: string; // Changed to string for UUID
    name: string;
    price: number;
    image_url: string;
    quantity: number;
}

type CartContextType = {
    cart: CartItem[]
    user: any
    loading: boolean
    setCart: React.Dispatch<React.SetStateAction<CartItem[]>>
    addToCart: (product: any) => void
    removeFromCart: (id: string) => void
    updateQuantity: (id: string, value: number) => void
    clearCart: () => void
}

export const CartContext = createContext<CartContextType | null>(null)

export default function CartProvider({ children }: any) {
    const [cart, setCart] = useState<CartItem[]>([])
    const [user, setUser] = useState<any>(null) // Local state for the user
    const [loading, setLoading] = useState(true);
    const isCartLoaded = useRef(false)
    const supabase = client()

    // 1. Get User Session on Mount
    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            setUser(user)

        }
        getUser()

        // Listen for auth changes (Login/Logout)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null)
            setLoading(false)
        })

        return () => subscription.unsubscribe()
    }, [])

    // 2. Load Cart from LocalStorage on Mount
    useEffect(() => {
        const persistData = localStorage.getItem('cart')
        if (persistData) {
            setCart(JSON.parse(persistData))
        }
        isCartLoaded.current = true
    }, [])

    // 3. Save Cart to LocalStorage whenever it changes
    useEffect(() => {
        if (!isCartLoaded.current) return
        localStorage.setItem('cart', JSON.stringify(cart))
    }, [cart])

    // 4. THE SYNC LOGIC: Guest Cart -> Database
    useEffect(() => {
        const syncCartWithDB = async () => {
            // Only sync if a user is logged in AND we have items in the cart
            if (user && cart.length > 0) {
                const itemsToSync = cart.map(item => ({
                    user_id: user.id,
                    product_id: item.id,
                    quantity: item.quantity
                }))

                // .upsert handles the "Conflict Resolution" automatically 
                // because of the UNIQUE constraint we set in SQL
                const { error } = await supabase
                    .from('cart_items')
                    .upsert(itemsToSync, { onConflict: 'user_id,product_id' })

                if (error) console.error("Sync Error:", error.message)
            }
        }

        syncCartWithDB()
    }, [user, cart]) // Runs whenever user logs in or cart updates

    // 5. THE PULL LOGIC: Database -> React State
    useEffect(() => {
        const pullAndMergeCart = async () => {
            // Only pull if we have a user and we haven't already synced this session
            if (user) {
                const { data, error } = await supabase
                    .from('cart_items')
                    .select(`
                    quantity,
                    products (
                        id,
                        name,
                        price,
                        image_url
                    )
                `)
                    .eq('user_id', user.id);

                if (error) {
                    console.error("Error pulling cart:", error.message);
                    return;
                }

                if (data) {
                    // STEP 1: Transform the nested Supabase data into our CartItem format
                    const dbItems: CartItem[] = data.map((item: any) => ({
                        id: item.products.id,
                        name: item.products.name,
                        price: item.products.price,
                        image_url: item.products.image_url,
                        quantity: item.quantity
                    }));

                    // STEP 2: Merge logic
                    // If the user had items in their guest cart before logging in,
                    // we keep those AND the items from the database.
                    setCart(prevCart => {
                        const merged = [...prevCart];

                        dbItems.forEach(dbItem => {
                            const existingIndex = merged.findIndex(item => item.id === dbItem.id);
                            if (existingIndex > -1) {
                                // If it exists in both, we trust the DB quantity or add them
                                // For now, let's just let the DB items take priority
                                merged[existingIndex] = dbItem;
                            } else {
                                merged.push(dbItem);
                            }
                        });

                        return merged;
                    });
                }
            }
        };

        pullAndMergeCart();
    }, [user]); // Only runs when the user object changes (Login/Logout)

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

    const removeFromCart = async (id: string) => {
        // Update local state first (for speed)
        setCart(prev => prev.filter(item => item.id !== id))

        // If logged in, tell the DB to drop that row
        if (user) {
            const { error } = await supabase
                .from('cart_items')
                .delete()
                .eq('user_id', user.id)
                .eq('product_id', id) // Ensure we only delete this specific product for this user

            if (error) console.error("Error removing from DB:", error.message)
        }
    }

    const updateQuantity = async (id: string, value: number) => {
        // 1. Find the item to see what its current quantity is
        const item = cart.find(i => i.id === id)
        if (!item) return

        const newQuantity = item.quantity + value

        // 2. Check if this is a "Hidden Deletion"
        if (newQuantity <= 0) {
            // If quantity is 0 or less, use our delete logic
            await removeFromCart(id)
        } else {
            // 3. Otherwise, just update the state
            // The existing useEffect will pick up this change and "Upsert" the new quantity to the DB
            setCart(prev => prev.map(item =>
                item.id === id ? { ...item, quantity: newQuantity } : item
            ))
        }
    }
    const clearCart = async () => {
        // Wipe local state
        setCart([])

        // If logged in, wipe the user's DB cart
        if (user) {
            const { error } = await supabase
                .from('cart_items')
                .delete()
                .eq('user_id', user.id) // Delete EVERY row for this user

            if (error) console.error("Error clearing DB cart:", error.message)
        }
    }

    return (
        <CartContext.Provider value={{ cart, user, loading, setCart, addToCart, removeFromCart, updateQuantity, clearCart }}>
            {children}
        </CartContext.Provider>
    )
}