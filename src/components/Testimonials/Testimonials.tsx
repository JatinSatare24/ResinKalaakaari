// --- IMPORTS ---
import Image from "next/image";
import Carousel from "@/components/Carousel/Carousel";
import { testimonials } from "@/data/testimonials";
import styles from "./Testimonials.module.css";

// --- COMPONENT ---
// A Server Component: the text is static and only the Carousel is interactive.
export default function Testimonials() {
  // --- RENDER ---
  return (
    <section
      className={styles.testimonials}
      id="testimonials"
      aria-labelledby="testimonials-heading"
    >
      <div className={styles.contentWrapper}>
        {/* --- TEXT CONTENT --- */}
        <div className={styles.textContent}>
          <h2 id="testimonials-heading" className={styles.heading}>
            What Our <br /> Customers Say
          </h2>
          <p className={styles.description}>
            Real stories from people who brought a piece of Resin Kalaakaari
            into their homes.
          </p>
        </div>

        {/* --- TESTIMONIAL CAROUSEL --- */}
        <div className={styles.cardContainer}>
          <Carousel
            autoplay
            interval={4000}
            showArrows
            label="Customer testimonials"
          >
            {testimonials.map((testimonial) => (
              <div key={testimonial.id} className={styles.card}>
                <figure className={styles.figure}>
                  {/* No `priority` here: this section is far below the fold,
                      so its images should load lazily. */}
                  <Image
                    src={testimonial.image}
                    alt={testimonial.alt}
                    width={800}
                    height={600}
                    className={styles.image}
                  />
                </figure>
              </div>
            ))}
          </Carousel>
        </div>
      </div>
    </section>
  );
}
