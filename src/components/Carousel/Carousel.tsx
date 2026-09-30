"use client";

/**
 * CAROUSEL COMPONENT
 * A flexible, auto-playing slider. Client Component because it keeps the
 * current slide in state and runs a timer.
 */

// --- IMPORTS ---
import { Children, useEffect, useState, type ReactNode } from "react";
import styles from "./Carousel.module.css";

// --- INTERFACES ---
export interface CarouselProps {
  children: ReactNode | ReactNode[];
  label: string; // read out by screen readers, e.g. "Customer testimonials"
  autoplay?: boolean;
  interval?: number;
  showArrows?: boolean;
  className?: string;
}

// --- COMPONENT ---
export default function Carousel({
  children,
  label,
  autoplay = false,
  interval = 4000,
  showArrows = true,
  className = "",
}: CarouselProps) {
  // --- STATE & VARIABLES ---
  const slides = Children.toArray(children);
  const count = slides.length;
  const [index, setIndex] = useState<number>(0);
  // True while the mouse is over the carousel or keyboard focus is inside it.
  const [paused, setPaused] = useState<boolean>(false);

  // --- HANDLERS ---
  const next = () => setIndex((prev) => (prev + 1) % count);
  const prev = () => setIndex((prev) => (prev === 0 ? count - 1 : prev - 1));

  // --- LIFECYCLE: AUTOPLAY ---
  useEffect(() => {
    if (!autoplay || paused || count <= 1) return;

    // People who ask their device for less motion get no auto-sliding.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // The functional setIndex means the timer never needs `next` itself,
    // so the dependency list below is complete.
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % count);
    }, interval);
    return () => clearInterval(timer);
  }, [autoplay, paused, interval, count]);

  // --- RENDER ---
  return (
    <section
      className={`${styles.carousel} ${className}`}
      aria-roledescription="carousel"
      aria-label={label}
      // Auto-moving content must be stoppable (WCAG 2.2.2): hover or focus pauses it.
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {/* Sliding Track */}
      <div
        className={styles.track}
        style={{ transform: `translateX(-${index * 100}%)` }}
        aria-live={autoplay && !paused ? "off" : "polite"}
      >
        {slides.map((slide, i) => (
          <div
            className={styles.slide}
            key={i}
            // `inert` hides off-screen slides from screen readers AND takes
            // their links out of the Tab order (aria-hidden alone does not).
            inert={i !== index}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${count}`}
          >
            {slide}
          </div>
        ))}
      </div>

      {/* Navigation Controls */}
      {showArrows && count > 1 && (
        <div className={styles.controls}>
          <button
            className={styles.prev}
            onClick={prev}
            aria-label="Previous slide"
            type="button"
          >
            &lt;
          </button>
          <button
            className={styles.next}
            onClick={next}
            aria-label="Next slide"
            type="button"
          >
            &gt;
          </button>
        </div>
      )}
    </section>
  );
}
