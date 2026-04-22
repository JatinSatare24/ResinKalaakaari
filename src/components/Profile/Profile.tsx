"use client"

// --- IMPORTS ---
import React, { useState, useEffect, useContext } from "react"
import { useRouter } from "next/navigation"
import { CartContext } from "@/context/CartContext"
import { client } from "@/lib/supabase"
import Loader from '@/components/Spinner/Spinner'
import styles from "@/components/Profile/Profile.module.css"

// --- INTERFACES ---
export interface ProfileState {
    full_name: string;
    phone: string;
    address_line: string;
    city: string;
    state: string;
    pincode: string;
}

// --- COMPONENT ---
export default function Profile() {
    // --- CONTEXT & UTILS ---
    const { user, loading: authLoading } = useContext(CartContext)!
    const supabase = client()
    const router = useRouter()

    // --- STATE ---
    const [loading, setLoading] = useState<boolean>(true)
    const [updating, setUpdating] = useState<boolean>(false)
    const [profile, setProfile] = useState<ProfileState>({
        full_name: "",
        phone: "",
        address_line: "",
        city: "",
        state: "",
        pincode: ""
    })

    // --- LIFECYCLE & DATA FETCHING ---
    useEffect(() => {
        const fetchProfile = async () => {
            if (!user) return

            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single()

                if (error) throw error

                if (data) {
                    setProfile({
                        full_name: data.full_name || "",
                        phone: data.phone || "",
                        address_line: data.address_line || "",
                        city: data.city || "",
                        state: data.state || "",
                        pincode: data.pincode || ""
                    })
                }
            } catch (err: unknown) {
                console.error("Error fetching profile:", err)
            } finally {
                setLoading(false)
            }
        }

        if (!authLoading) {
            if (!user) router.push('/login')
            else fetchProfile()
        }
    }, [user, authLoading, router, supabase])

    // --- HANDLERS ---
    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setUpdating(true);

        try {
            // 1. Create the payload without the ID
            const payload: Partial<ProfileState> = {
                full_name: profile.full_name,
                phone: profile.phone,
                address_line: profile.address_line,
                city: profile.city,
                state: profile.state,
                pincode: profile.pincode,
            };

            // 2. Perform the update with the .eq() filter
            const { error } = await supabase
                .from('profiles')
                .update(payload)
                .eq('id', user?.id);

            if (error) throw error;

            alert("Profile updated successfully! ✨");
        } catch (err: any) {
            console.error("Supabase Error:", err.message);
            alert(`Error: ${err.message}`);
        } finally {
            setUpdating(false);
        }
    };

    // --- RENDER GUARDS ---
    if (authLoading || loading) return <Loader message={'Loading your profile'} />

    // --- MAIN RENDER ---
    return (
        <main className={styles.container} aria-labelledby="profile-title">
            {/* --- HEADER --- */}
            <header className={styles.header}>
                <h1 id="profile-title">Your Profile</h1>
                <button
                    className={styles.ordersShortcut}
                    onClick={() => router.push('/my-orders')}
                    aria-label="Navigate to my orders"
                >
                    📦 View My Orders
                </button>
            </header>

            {/* --- PROFILE FORM --- */}
            <form onSubmit={handleUpdate} className={styles.form} aria-label="Edit Profile Details">

                {/* Personal Details Section */}
                <section className={styles.section} aria-labelledby="personal-details-heading">
                    <h3 id="personal-details-heading">Personal Details</h3>
                    <input
                        type="text"
                        placeholder="Full Name"
                        aria-label="Full Name"
                        value={profile.full_name}
                        onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                    />
                    <input
                        type="email"
                        aria-label="Email (Disabled)"
                        value={user?.email || ""}
                        disabled
                        className={styles.disabledInput}
                    />
                    <input
                        type="tel"
                        placeholder="Phone Number"
                        aria-label="Phone Number"
                        value={profile.phone}
                        onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    />
                </section>

                {/* Shipping Address Section */}
                <section className={styles.section} aria-labelledby="shipping-address-heading">
                    <h3 id="shipping-address-heading">Shipping Address</h3>
                    <textarea
                        placeholder="Full Address"
                        aria-label="Full Shipping Address"
                        rows={3}
                        value={profile.address_line}
                        onChange={(e) => setProfile({ ...profile, address_line: e.target.value })}
                    />
                    <div className={styles.row}>
                        <input
                            type="text"
                            placeholder="City"
                            aria-label="City"
                            value={profile.city}
                            onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                        />
                        <input
                            type="text"
                            placeholder="State"
                            aria-label="State"
                            value={profile.state}
                            onChange={(e) => setProfile({ ...profile, state: e.target.value })}
                        />
                        <input
                            type="text"
                            placeholder="Pincode"
                            aria-label="Pincode"
                            value={profile.pincode}
                            onChange={(e) => setProfile({ ...profile, pincode: e.target.value })}
                        />
                    </div>
                </section>

                {/* Submit Action */}
                <button
                    type="submit"
                    disabled={updating}
                    className={styles.saveBtn}
                    aria-busy={updating}
                >
                    {updating ? "Saving..." : "Save Changes"}
                </button>
            </form>
        </main>
    )
}