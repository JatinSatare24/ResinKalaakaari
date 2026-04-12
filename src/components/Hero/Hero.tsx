"use client"

import { useState, useEffect } from "react"
import Link from 'next/link'
import styles from '@/components/Hero/Hero.module.css'
import { slides } from '@/data/slides'

export default function Hero() {

    const [index, setIndex] = useState(0)

    const next = () => {
        setIndex((prev) => (prev + 1) % slides.length)
    }

    const prev = () => {
        setIndex(prev => prev === 0 ? slides.length - 1 : prev - 1)
    }

    // Autoplay functionality
    useEffect(() => {
        const interval = setInterval(() => {
            next();
        }, 4000); // Change slide every 4 seconds

        return () => clearInterval(interval); // Cleanup on unmount
    }, []);

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