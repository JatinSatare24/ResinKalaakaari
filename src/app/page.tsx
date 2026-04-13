import Link from 'next/link'
import Hero from '@/components/Hero/Hero'
import FeaturedProducts from '@/components/FeaturedProducts/FeaturedProducts';
import ShopByCategory from '@/components/ShopByCategory/ShopByCategory';
import Gallery from '@/components/Gallery/Gallery';
import Testimonials from '@/components/Testimonials/Testimonials';

export default function Home() {
  return (
    <main>
      <Hero />
      <FeaturedProducts />
      <ShopByCategory />
      <Gallery />
      <Testimonials />
    </main>
  );
}