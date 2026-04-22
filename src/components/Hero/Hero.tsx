"use client";

// --- IMPORTS ---
import Image from "next/image";
import Link from "next/link";
import Carousel from "@/components/Carousel/Carousel";
import styles from "@/components/Hero/Hero.module.css";
import { slides } from "@/data/slides";

// --- INTERFACES ---
export interface HeroProps {
    // Reserved for future scalability (e.g., passing dynamic banner text)
}

export interface SlideData {
    title: string;
    image: string;
}

// --- COMPONENT ---
export default function Hero(props: HeroProps) {
    // --- RENDER ---
    return (
        <section 
            className={styles.hero} 
            aria-label="Hero Promotional Section"
        >
            {/* --- MOBILE & TABLET CAROUSEL --- */}
            {/* Hidden on large screens via CSS */}
            <Carousel 
                autoplay 
                interval={4000} 
                showArrows 
                className={styles.carousel}
                aria-label="Featured promotions carousel"
            >
                {(slides as SlideData[]).map((slide) => (
                    <div className={styles.slide} key={slide.title}>
                        <Image
                            src={slide.image}
                            alt={`Promotional showcase for ${slide.title}`} // a11y: Descriptive alt text
                            fill
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
                            style={{ objectFit: 'cover' }}
                            className={styles.image}
                        />
                        <div className={styles.overlay}>
                            <Link 
                                href="/products" 
                                className={styles.cta}
                                aria-label={`Shop the ${slide.title} collection`} // a11y: Contextual link text
                            >
                                Shop Now
                            </Link>
                        </div>
                    </div>
                ))}
            </Carousel>

            {/* --- DESKTOP SINGLE BANNER --- */}
            {/* Only visible on 1024px+ */}
            <div className={styles.desktopBanner}>
                <div className={styles.bannerContent}>
                    <h1 className={styles.headline}>ARTFUL FRAMES</h1>
                    <p className={styles.subText}>Hand-poured art for your home.</p>
                    <div className={styles.overlay}>
                        <Link 
                            href="/products" 
                            className={styles.cta}
                            aria-label="Shop our artful frames and hand-poured art" // a11y: Contextual link text
                        >
                            Shop Now
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    );
}