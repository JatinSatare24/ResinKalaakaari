"use client";

// --- IMPORTS ---
import React from 'react';
import Image from "next/image";
import Carousel from "@/components/Carousel/Carousel";
import { testimonials } from "@/data/testimonials";
import styles from "./Testimonials.module.css";

// --- INTERFACES ---
export interface Testimonial {
    id: string | number;
    image: string;
    alt: string;
}

// --- COMPONENT ---
export default function Testimonials() {
    // --- RENDER ---
    return (
        <section
            className={styles.testimonials}
            id='testimonials'
            aria-labelledby="testimonials-heading"
        >
            <div className={styles.contentWrapper}>

                {/* --- TEXT CONTENT --- */}
                <div className={styles.textContent}>
                    <h2 id="testimonials-heading" className={styles.heading}>
                        What Our <br /> Customers Say
                    </h2>
                    <p className={styles.description}>
                        Real stories from people who brought a piece of Resin Kalaakaari into their homes.
                    </p>
                </div>

                {/* --- TESTIMONIAL CAROUSEL --- */}
                <div
                    className={styles.cardContainer}
                    role="region"
                    aria-roledescription="carousel"
                    aria-label="Customer testimonials"
                >
                    <Carousel autoplay interval={4000} showArrows>
                        {(testimonials as Testimonial[]).map((testimonial) => (
                            <div key={testimonial.id} className={styles.card}>
                                <figure style={{ margin: 0, height: '100%' }}>
                                    <Image
                                        src={testimonial.image}
                                        alt={testimonial.alt} // a11y: Crucial for image-based reviews
                                        width={800}
                                        height={600}
                                        className={styles.image}
                                        priority
                                    />
                                    {/* figcaption can be added here if text content exists in data */}
                                </figure>
                            </div>
                        ))}
                    </Carousel>
                </div>

            </div>
        </section>
    );
}