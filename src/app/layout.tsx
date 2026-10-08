import AssistantWidget from "@/components/Assistant/AssistantWidget";
import Navbar from "@/components/Navbar/Navbar";
import Footer from "@/components/Footer/Footer";
import "./globals.css";
import CartProvider from "@/context/CartContext";
import { AI_LIMITS, isAiAvailable, readAiConfig } from "@/lib/ai/config";
import { buildWhatsAppUrl } from "@/lib/ai/guard";
import { QUICK_REPLIES } from "@/lib/ai/knowledge";
import { Inter, Playfair_Display } from "next/font/google";
import type { Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: new URL("https://resinkalaakaari.in"),
  title: "Resin Kalaakaari | Handcrafted Resin Art",
  description:
    "Preserve your most precious memories in beautiful, handcrafted resin art. Specializing in varmala preservation, custom nameplates, and unique jewelry.",
  icons: {
    icon: [
      { url: "/Icons/favicon.ico" },
      { url: "/Icons/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/Icons/apple-touch-icon.png" }],
  },
  // If you have a manifest file, link it here for Android/Chrome
  manifest: "/Icons/site.webmanifest",
  openGraph: {
    title: "Resin Kalaakaari",
    description: "Customized Resin Art & Flower Preservation",
    url: "https://resinkalaakaari.in",
    siteName: "Resin Kalaakaari",
    images: [
      {
        url: "/Hero/Hero1.webp",
        width: 1200,
        height: 630,
      },
    ],
    locale: "en_IN",
    type: "website",
  },
};

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The bubble is drawn only when the assistant is switched on AND fully set
  // up (isAiAvailable). Read on the server, so nothing about it reaches a
  // browser when it is off. Shop pages are built ahead of time, so changing
  // the switch needs a new deploy; the chat endpoint re-checks it on every
  // request anyway.
  const assistantOn = isAiAvailable(readAiConfig());

  return (
    <html lang="en">
      <body className={`${inter.variable} ${playfair.variable}`}>
        <CartProvider>
          <div className="app-container">
            <Navbar />
            <main>{children}</main>
            <Footer />
          </div>
          {assistantOn && (
            <AssistantWidget
              quickReplies={QUICK_REPLIES}
              whatsappUrl={buildWhatsAppUrl(null)}
              maxMessageChars={AI_LIMITS.maxMessageChars}
              historyLimit={AI_LIMITS.maxHistoryMessages}
            />
          )}
        </CartProvider>
      </body>
    </html>
  );
}
