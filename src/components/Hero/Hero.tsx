// --- IMPORTS ---
import Image from "next/image";
import Link from "next/link";
import Carousel from "@/components/Carousel/Carousel";
import styles from "@/components/Hero/Hero.module.css";
import { slides } from "@/data/slides";

// --- COMPONENT ---
// A Server Component: nothing here needs state or browser APIs. Only the
// Carousel it renders is a Client Component, so the slides array and this
// markup never ship as JavaScript to the browser.
export default function Hero() {
  return (
    <section className={styles.hero} aria-label="Hero Promotional Section">
      {/* The page's one <h1>. The visible desktop headline below is only shown
          at 1280px+, so without this phones and tablets would have no h1. */}
      <h1 className={styles.srOnly}>Resin Kalaakaari: handcrafted resin art</h1>

      {/* --- MOBILE & TABLET CAROUSEL --- */}
      {/* Hidden on large screens via CSS */}
      <Carousel
        autoplay
        interval={4000}
        showArrows
        label="Featured promotions"
        className={styles.carousel}
      >
        {slides.map((slide, i) => (
          <div className={styles.slide} key={slide.title}>
            <Image
              src={slide.image}
              alt={`Promotional showcase for ${slide.title}`}
              fill
              // Slides are full width, so the browser should pick by 100vw.
              sizes="100vw"
              className={styles.image}
              // Only the first slide is on screen at load (the LCP image):
              // fetch it right away. Next 16 deprecates `priority`, and its
              // docs recommend loading + fetchPriority instead of `preload`.
              loading={i === 0 ? "eager" : undefined}
              fetchPriority={i === 0 ? "high" : undefined}
            />
            <div className={styles.overlay}>
              {/* Accessible name keeps the visible words "Shop Now" (WCAG 2.5.3). */}
              <Link
                href="/products"
                className={styles.cta}
                aria-label={`Shop Now: ${slide.title}`}
              >
                Shop Now
              </Link>
            </div>
          </div>
        ))}
      </Carousel>

      {/* --- DESKTOP SINGLE BANNER --- */}
      {/* Only visible on 1280px+ */}
      <div className={styles.desktopBanner}>
        <div className={styles.bannerContent}>
          <p className={styles.headline}>ARTFUL FRAMES</p>
          <p className={styles.subText}>Hand-poured art for your home.</p>
          <div className={styles.overlay}>
            <Link
              href="/products"
              className={styles.cta}
              aria-label="Shop Now: artful frames and hand-poured art"
            >
              Shop Now
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
