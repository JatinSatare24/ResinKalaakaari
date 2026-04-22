/**
 * ABOUT US COMPONENT
 * Displays the personal story of Sanika and the brand mission.
 * Layout: Split-screen (Image & Text) on desktop, single column on mobile.
 */

// --- IMPORTS ---
import React from 'react';
import Image from 'next/image';
import styles from './AboutUs.module.css';

// --- INTERFACES ---
export interface AboutUsProps {
  // Interface established for future scalability (e.g., dynamic bio data)
}

// --- COMPONENT ---
const AboutUs: React.FC<AboutUsProps> = () => {
  // --- RENDER ---
  return (
    <main className={styles.aboutContainer} aria-labelledby="about-main-title">

      {/* --- HERO SECTION --- */}
      <header className={styles.heroSection}>
        <h1 id="about-main-title" className={styles.mainTitle}>Our Story</h1>
        <p className={styles.intro}>
          Preserving memories beautifully for a lifetime.
        </p>
      </header>

      {/* --- MAIN CONTENT SECTION --- */}
      <section className={styles.contentSection} aria-labelledby="artist-intro-heading">

        {/* --- PROFILE IMAGE SIDE --- */}
        <div className={styles.imageWrapper} role="img" aria-label="Portrait of Sanika">
          <Image
            src="/Sanika/Sanika.webp"
            alt="Sanika - The Artist and founder behind Resin Kalaakaari"
            width={600}
            height={800}
            className={styles.profileImg}
            priority // Optimization for LCP image
          />
        </div>

        {/* --- NARRATIVE TEXT SIDE --- */}
        <div className={styles.textWrapper}>
          <header>
            <h2 id="artist-intro-heading" className={styles.artistName}>
              Hi, I’m Sanika
            </h2>
            <p className={styles.tagline}>
              A 26-year-old Pune-based artist and the heart behind this brand.
            </p>
          </header>

          <article className={styles.storyText}>
            <p>
              What started two years ago as a small passion has now grown into a
              meaningful journey of creating <strong className={styles.highlight}>personalized resin keepsakes</strong>.
              Every piece you see here is thoughtfully handcrafted by me, with
              attention to detail, care, and a deep understanding of how special
              your memories are.
            </p>

            <p>
              From preserving wedding <strong className={styles.highlight}>varmala flowers</strong> to creating custom
              nameplates and personalized gifts, my goal is simple—to turn
              your emotions into timeless creations.
            </p>

            <blockquote className={styles.quote}>
              <p>
                "This is a one-woman-run business, and every order is handled
                with dedication, love, and precision."
              </p>
            </blockquote>

            <p>
              I don’t just create products—I preserve moments, emotions, and
              stories that you can cherish forever.
            </p>
          </article>
        </div>

      </section>
    </main>
  );
}

export default AboutUs;