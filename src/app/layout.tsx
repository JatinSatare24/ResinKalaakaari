import Navbar from '@/components/Navbar/Navbar'
import './globals.css'
import CartProvider from '@/context/CartContext'
import { Inter, Playfair_Display } from 'next/font/google'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
})

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${playfair.variable}`}>
        <CartProvider>
          <Navbar />
          {children}
        </CartProvider>

      </body>
    </html>
  );
}