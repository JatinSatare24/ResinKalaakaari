"use client";

import { useState, useEffect, ReactNode } from "react";
import styles from "./Carousel.module.css";

interface CarouselProps {
  children: ReactNode[];
  autoplay?: boolean;
  interval?: number;
  showArrows?: boolean;
  className?: string;
}

export default function Carousel({
  children,
  autoplay = false,
  interval = 4000,
  showArrows = true,
  className = "",
}: CarouselProps) {
  const slides = Array.isArray(children) ? children : [children];
  const [index, setIndex] = useState(0);

  const next = () => {
    setIndex((prev) => (prev + 1) % slides.length);
  };

  const prev = () => {
    setIndex((prev) =>
      prev === 0 ? slides.length - 1 : prev - 1
    );
  };

  useEffect(() => {
    if (!autoplay) return;

    const timer = setInterval(next, interval);
    return () => clearInterval(timer);
  }, [autoplay, interval, slides.length]);

  return (
    <div className={`${styles.carousel} ${className}`}>
      <div
        className={styles.track}
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {slides.map((slide, i) => (
          <div className={styles.slide} key={i}>
            {slide}
          </div>
        ))}
      </div>

      {showArrows && slides.length > 1 && (
        <>
          <button className={styles.prev} onClick={prev}>
            &lt;
          </button>
          <button className={styles.next} onClick={next}>
            &gt;
          </button>
        </>
      )}
    </div>
  );
}