import Link from 'next/link'
import Hero from '@/components/Hero/Hero'
import FeaturedProducts from '@/components/FeaturedProducts/FeaturedProducts'; 
import ShopByCategory from '@/components/ShopByCategory/ShopByCategory';

export default function Home() {
  return (
    <main>
      <Hero />
      <FeaturedProducts />
      <ShopByCategory />
    </main>
  );
}