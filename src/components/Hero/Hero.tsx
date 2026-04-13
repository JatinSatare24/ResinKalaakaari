"use client";

import Image from "next/image";
import Link from "next/link";
import Carousel from "@/components/Carousel/Carousel";
import styles from "@/components/Hero/Hero.module.css";
import { slides } from "@/data/slides";

export default function Hero() {
    return (
        <section className={styles.hero}>
            <Carousel autoplay interval={4000} showArrows>
                {slides.map((slide) => (
                    <div className={styles.slide} key={slide.title}>
                        <Image
                            src={slide.image}
                            alt={slide.title}
                            fill
                            priority
                            className={styles.image}
                        />
                        <div className={styles.overlay}>
                            <Link href="/products" className={styles.cta}>
                                Shop Now
                            </Link>
                        </div>
                    </div>
                ))}
            </Carousel>
        </section>
    );
}