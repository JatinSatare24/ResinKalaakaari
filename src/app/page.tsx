import type { Metadata } from "next";
import { Suspense } from "react";
import Hero from "@/components/Hero/Hero";
import FeaturedProducts from "@/components/FeaturedProducts/FeaturedProducts";
import ShopByCategory from "@/components/ShopByCategory/ShopByCategory";
import Gallery from "@/components/Gallery/Gallery";
import Testimonials from "@/components/Testimonials/Testimonials";
import Loader from "@/components/Spinner/Spinner";

// Title, description and the social-share image come from the root layout.
// Only the canonical URL is specific to the home page.
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

// The root layout already wraps every page in <main>, so this is a fragment.
export default function Home() {
  return (
    <>
      {/* Static: shown immediately. */}
      <Hero />

      {/* Each data section has its own <Suspense>: the three queries start
          at the same time, each section streams in when its own data is
          ready, and a slow one never blocks the others. */}
      <Suspense
        fallback={
          <Loader variant="section" message="Loading featured products" />
        }
      >
        <FeaturedProducts />
      </Suspense>

      <Suspense
        fallback={<Loader variant="section" message="Loading categories" />}
      >
        <ShopByCategory />
      </Suspense>

      <Suspense
        fallback={<Loader variant="section" message="Loading gallery" />}
      >
        <Gallery />
      </Suspense>

      <Testimonials />
    </>
  );
}
