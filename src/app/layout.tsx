import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { LocalBusinessJsonLd } from "@/components/JsonLd";
import { CartProvider } from "@/components/shop/CartProvider";
import { CartDrawer } from "@/components/shop/CartDrawer";
import { AnnouncementBar } from "@/components/shop/AnnouncementBar";
import { business } from "@/data/business";
import { img } from "@/data/images";
import "./globals.css";

/**
 * Cormorant Garamond carries the headings — a high-contrast serif with the
 * elegance of a patisserie box. Manrope handles everything readable.
 * Both are self-hosted by next/font, so there's no render-blocking request
 * to Google and no layout shift when they swap in.
 */
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-manrope",
  display: "swap",
});

/** Social preview image, shared by Open Graph and Twitter cards. */
const shareImage = img("pistachio-mix");

export const metadata: Metadata = {
  metadataBase: new URL(business.siteUrl),
  title: {
    default: `${business.name} | Lebanese Sweets & Desserts in Bass Hill`,
    template: `%s | ${business.name}`,
  },
  description:
    "Discover traditional Lebanese sweets, baklava, knafeh, ashta desserts and celebration platters at Ammoun Sweets in Bass Hill, NSW.",
  keywords: [
    "Lebanese sweets Bass Hill",
    "Lebanese desserts Sydney",
    "baklava Bass Hill",
    "knafeh Sydney",
    "Middle Eastern sweets",
    "sweets shop Bass Hill",
    "ashta desserts Sydney",
    "sweet platters Sydney",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "en_AU",
    siteName: business.name,
    title: `${business.name} | Lebanese Sweets & Desserts in Bass Hill`,
    description:
      "Traditional Lebanese sweets, baklava, knafeh, ashta desserts and celebration platters in Bass Hill, NSW.",
    url: "/",
    images: [
      {
        // Dimensions come from the image registry so they can't drift when a
        // photo is swapped. A landscape shot reads better in social previews
        // than the portrait hero.
        url: shareImage.src,
        width: shareImage.width,
        height: shareImage.height,
        alt: "Rows of pistachio-dusted Lebanese pastries at Ammoun Sweets",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${business.name} | Lebanese Sweets in Bass Hill`,
    description:
      "Traditional Lebanese sweets, baklava, knafeh and celebration platters in Bass Hill, NSW.",
    images: [shareImage.src],
  },
  robots: {
    // DEMO: switch to index/follow once this goes live on the real domain.
    index: false,
    follow: false,
  },
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    apple: "/favicon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#123b2a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-AU" className={`${cormorant.variable} ${manrope.variable}`}>
      <head>
        {/*
          Scroll-reveal elements start at opacity 0 and are revealed by an
          IntersectionObserver. Without JS nothing would ever reveal them, so
          this <noscript> block neutralises the animation entirely.

          Done in CSS rather than by toggling a class on <html>, because
          mutating the root element before hydration makes React's markup
          check fail.
        */}
        <noscript>
          <style>{`[data-reveal]{opacity:1!important;transform:none!important}`}</style>
        </noscript>
      </head>
      <body className="min-h-dvh bg-cream antialiased">
        {/*
          The cart provider wraps everything so the header badge, the product
          pages and the drawer all read one source of truth.
        */}
        <CartProvider>
          <AnnouncementBar />
          <Header />
          <main id="main">{children}</main>
          <Footer />
          <CartDrawer />
        </CartProvider>
        <LocalBusinessJsonLd />
      </body>
    </html>
  );
}
