"use client"

import { useState } from "react"
import Link from 'next/link'
import styles from '@/components/Hero/Hero.module.css'

export default function Hero() {

    const slides = [
        {
            image: "/hero1.png",
            title: "Handcrafted Resin Art",
            subtitle: "Unique pieces made with creativity",
        },
        {
            image: "/hero2.png",
            title: "Elegant Home Decor",
            subtitle: "Add beauty to your space",
        },
    ]

    const [index, setIndex] = useState(0)

    const next = () => {
        setIndex((prev) => (prev + 1) % slides.length)
    }

    const prev = () => {
        setIndex(prev => prev === 0 ? slides.length - 1 : prev - 1)
    }

    return (
        <section className={styles.hero}>
            <img
                src={slides[index].image}
                alt={slides[index].title}
                className={styles.image}
            />

            {/* Overlay */}
            <div className={styles.overlay}>
                <Link href='/products' className={styles.cta}>Shop Now</Link>
            </div>

            {/* controls */}
            <button onClick={prev} className={styles.prev}>&lt;</button>
            <button onClick={next} className={styles.next}>&gt;</button>
        </section>
    )
}