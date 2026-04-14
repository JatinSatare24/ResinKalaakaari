"use client";

import Carousel from "@/components/Carousel/Carousel";
import styles from "./Testimonials.module.css";
import { testimonials } from "@/data/testimonials";
import Image from "next/image";

export default function Testimonials() {
    return (
        <section className={styles.testimonials}>
            <h2 className={styles.heading}>What Our Customers Say</h2>
            <div className={styles.cardContainer}>
                <Carousel autoplay interval={4000} showArrows={false}>
                    {testimonials.map((testimonial) => (
                        <div key={testimonial.id} className={styles.card}>
                            <Image
                                src={testimonial.image}
                                alt={testimonial.alt}
                                width={800}
                                height={600}
                                className={styles.image}
                            />
                        </div>
                    ))}
                </Carousel>
            </div>

        </section>
    );
}