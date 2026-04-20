import Image from 'next/image';
import styles from './AboutUs.module.css';

export default function AboutUs() {
  return (
    <main className={styles.aboutContainer}>
      <div className={styles.heroSection}>
        <h1 className={styles.mainTitle}>Our Story</h1>
        <p className={styles.intro}>
          Preserving memories beautifully for a lifetime.
        </p>
      </div>

      <section className={styles.contentSection}>
        {/* IMAGE SIDE */}
        <div className={styles.imageWrapper}>
          <Image 
            src="/Sanika/Sanika.webp" // Placeholder for Sanika's photo
            alt="Sanika - The Artist behind Resin Kalaakaari"
            width={600}
            height={800}
            className={styles.profileImg}
          />
        </div>

        {/* TEXT SIDE */}
        <div className={styles.textWrapper}>
          <h2 className={styles.artistName}>Hi, I’m Sanika</h2>
          <p className={styles.tagline}>A 26-year-old Pune-based artist and the heart behind this brand.</p>
          
          <div className={styles.storyText}>
            <p>
              What started two years ago as a small passion has now grown into a 
              meaningful journey of creating <strong>personalized resin keepsakes</strong>. 
              Every piece you see here is thoughtfully handcrafted by me, with 
              attention to detail, care, and a deep understanding of how special 
              your memories are.
            </p>
            
            <p>
              From preserving wedding <strong>varmala flowers</strong> to creating custom 
              nameplates and personalized gifts, my goal is simple—to turn 
              your emotions into timeless creations. 
            </p>

            <blockquote className={styles.quote}>
              "This is a one-woman-run business, and every order is handled 
              with dedication, love, and precision."
            </blockquote>

            <p>
              I don’t just create products—I preserve moments, emotions, and 
              stories that you can cherish forever.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}