import type { Metadata } from "next";
import { Inter, Sora } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import ChatWidget from "@/components/chat/ChatWidget";
import CartDrawer from "@/components/shop/CartDrawer";
import { CartProvider } from "@/lib/cart-context";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Sunflow Energy Solutions | Solar, Battery & EV Charging — Melbourne, VIC",
    template: "%s | Sunflow Energy Solutions",
  },
  description:
    "Premium solar panel, battery storage and EV charger installation for homes, businesses and government across Melbourne and Victoria. Get a free, no-obligation quote today.",
  keywords: [
    "solar installation Melbourne",
    "battery storage Victoria",
    "EV charger installation",
    "commercial solar Victoria",
    "residential solar Melbourne",
    "Sunflow Energy Solutions",
  ],
  metadataBase: new URL("https://www.sunflowenergysolutions.com.au"),
  openGraph: {
    title: "Sunflow Energy Solutions | Solar, Battery & EV Charging",
    description:
      "Premium solar, battery storage and EV charging solutions for Melbourne and Victoria. Residential, Commercial & Government.",
    url: "https://www.sunflowenergysolutions.com.au",
    siteName: "Sunflow Energy Solutions",
    locale: "en_AU",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en-AU"
      className={`${inter.variable} ${sora.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-white text-navy-900">
        <CartProvider>
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:rounded-md focus:bg-navy-900 focus:px-4 focus:py-2 focus:text-white"
          >
            Skip to content
          </a>
          <Navbar />
          <main id="main-content" className="flex-1">
            {children}
          </main>
          <Footer />
          <ChatWidget />
          <CartDrawer />
        </CartProvider>
      </body>
    </html>
  );
}
