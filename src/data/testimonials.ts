export type Testimonial = {
  id: number;
  image: string; // path inside /public
  alt: string; // each image is a screenshot of a review, so alt says which one
};

export const testimonials: Testimonial[] = [
  {
    id: 1,
    image: "/Testimonials/ManaliKadamTestimonial.webp",
    alt: "Customer review screenshot 1",
  },
  {
    id: 2,
    image: "/Testimonials/AnkithaShahiTestimonial.webp",
    alt: "Customer review screenshot 2",
  },
  {
    id: 3,
    image: "/Testimonials/AkashGuptaTestimonial.webp",
    alt: "Customer review screenshot 3",
  },
  {
    id: 4,
    image: "/Testimonials/testimonial4.webp",
    alt: "Customer review screenshot 4",
  },
  {
    id: 5,
    image: "/Testimonials/testimonial5.webp",
    alt: "Customer review screenshot 5",
  },
  {
    id: 6,
    image: "/Testimonials/testimonial6.webp",
    alt: "Customer review screenshot 6",
  },
  {
    id: 7,
    image: "/Testimonials/testimonial8.webp",
    alt: "Customer review screenshot 7",
  },
];
