"use client"; // reads the scroll position and scrolls on a click, so it runs in the browser

// --- IMPORTS ---
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import styles from "@/components/ProductGallery/ProductGallery.module.css";

// --- INTERFACES ---
export interface ProductGalleryProps {
  photos: string[]; // main photo first; the page only renders this for 2 or more
  name: string; // the product name, used for the picture descriptions
}

// --- COMPONENT ---
// A row of full-width pictures that the browser itself scrolls and snaps one
// at a time (CSS scroll-snap), so swiping on a phone needs no script at all.
// The script only does two small jobs: it reads which picture is showing (for
// the thumbnails and the "2 / 4" counter) and it scrolls to a picture when a
// thumbnail is pressed.
export default function ProductGallery({ photos, name }: ProductGalleryProps) {
  const total = photos.length;
  const viewportRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  // The same number as `active`, readable inside the listeners below without
  // re-attaching them every time the picture changes.
  const activeRef = useRef(0);
  // The picture a thumbnail press is scrolling to. While set, the scroll
  // handler ignores the pictures it passes on the way, so the highlight jumps
  // straight to the target instead of flickering through the ones between.
  const targetRef = useRef<number | null>(null);
  const unlockTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTarget = useCallback(() => {
    targetRef.current = null;
    if (unlockTimer.current) clearTimeout(unlockTimer.current);
    unlockTimer.current = null;
  }, []);

  // Which picture is showing = how far we have scrolled, in whole widths.
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    let frame = 0;
    const read = () => {
      frame = 0;
      const index = Math.round(viewport.scrollLeft / viewport.clientWidth);
      const clamped = Math.min(Math.max(index, 0), total - 1);
      if (targetRef.current !== null) {
        if (clamped !== targetRef.current) return; // still on the way
        clearTarget();
      }
      activeRef.current = clamped;
      setActive(clamped);
    };
    // Scroll events come many times per frame; read once per frame.
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(read);
    };
    viewport.addEventListener("scroll", onScroll, { passive: true });

    // If the width changes (phone turned sideways), the old scroll distance no
    // longer lines up with a picture: put the active one back in place.
    let lastWidth = viewport.clientWidth;
    const observer = new ResizeObserver(() => {
      if (viewport.clientWidth === lastWidth) return;
      lastWidth = viewport.clientWidth;
      viewport.scrollTo({ left: activeRef.current * viewport.clientWidth });
    });
    observer.observe(viewport);

    return () => {
      viewport.removeEventListener("scroll", onScroll);
      observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, [total, clearTarget]);

  useEffect(() => clearTarget, [clearTarget]);

  function showPhoto(index: number) {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    clearTarget();
    targetRef.current = index;
    // Safety net: if the scroll is interrupted (the user swipes meanwhile),
    // stop waiting for the target.
    unlockTimer.current = setTimeout(clearTarget, 800);

    activeRef.current = index;
    setActive(index);
    viewport.scrollTo({
      left: index * viewport.clientWidth,
      behavior: reduceMotion ? "auto" : "smooth",
    });
  }

  return (
    <div className={styles.gallery}>
      <div className={styles.frame}>
        {/* tabIndex 0 so a keyboard user can focus the row and scroll it with
            the arrow keys (browsers do that natively for a scroll area). */}
        <div
          ref={viewportRef}
          className={styles.viewport}
          role="group"
          aria-roledescription="carousel"
          aria-label={`Photos of ${name}`}
          tabIndex={0}
        >
          {photos.map((photo, index) => (
            <div
              key={photo}
              className={styles.slide}
              role="group"
              aria-roledescription="slide"
              aria-label={`Photo ${index + 1} of ${total}`}
            >
              <Image
                src={photo}
                alt={index === 0 ? name : `${name}, photo ${index + 1}`}
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                className={styles.image}
                // The first picture is at the top of the page: load it right
                // away. The others wait until they are near the screen.
                loading={index === 0 ? "eager" : "lazy"}
                fetchPriority={index === 0 ? "high" : "auto"}
                draggable={false}
              />
            </div>
          ))}
        </div>
        {/* The counter repeats what the thumbnails and slide labels already
            say, so screen readers skip it. */}
        <p className={styles.counter} aria-hidden="true">
          {active + 1} / {total}
        </p>
      </div>

      <ul className={styles.thumbnails}>
        {photos.map((photo, index) => (
          <li key={photo}>
            <button
              type="button"
              className={
                index === active
                  ? `${styles.thumbnail} ${styles.thumbnailActive}`
                  : styles.thumbnail
              }
              onClick={() => showPhoto(index)}
              aria-label={`Show photo ${index + 1} of ${total}`}
              aria-current={index === active ? "true" : undefined}
            >
              <Image
                src={photo}
                alt=""
                width={128}
                height={128}
                sizes="64px"
                className={styles.thumbnailImage}
                draggable={false}
              />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
